import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, CATEGORIES } from "@/lib/anthropic";
import { applyRules, normalizeKey } from "@/lib/categorize";
import type { Category } from "@/lib/anthropic";

type PendingTxn = {
  id: string;
  description: string;
  merchant_name: string | null;
  merchant_website: string | null;
  amount: number;
  type: string | null;
};

function getMerchantKey(t: PendingTxn): string {
  if (t.merchant_name) return normalizeKey(t.merchant_name);
  return normalizeKey(t.description).slice(0, 40);
}

const AI_BATCH_SIZE = 60; // merchants per call — keeps JSON response well under token limits

async function batchCategorize(
  merchants: Array<{ key: string; txns: PendingTxn[] }>
): Promise<Map<string, Category>> {
  if (merchants.length === 0) return new Map();

  const merchantList = merchants
    .map(({ key, txns }) => {
      const sample = txns[0];
      const sampleDescs = Array.from(new Set(txns.slice(0, 3).map((t) => t.description))).join(" | ");
      const avgAmt = txns.reduce((s, t) => s + Math.abs(t.amount), 0) / txns.length;
      const website = sample.merchant_website ? ` [${sample.merchant_website}]` : "";
      const txnType = sample.type ? ` (${sample.type})` : "";
      return `KEY:${key} | NAME:${sample.merchant_name ?? "(none)"} | DESCS:${sampleDescs} | AVG:NZD${avgAmt.toFixed(2)}${website}${txnType}`;
    })
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are categorising NZ bank transactions for a personal finance app.
Assign each merchant to exactly one category.

CATEGORIES: ${CATEGORIES.join(", ")}

NZ MERCHANTS:
- Pak'nSave/Countdown/New World/Woolworths/Four Square = Groceries
- Z Energy/BP/Mobil/Gull/Caltex = Fuel
- Spark/Vodafone/2degrees/One NZ/Slingshot/Orcon/Bigpipe = Phone & internet
- Contact/Genesis/Mercury/Meridian/Trustpower/Vector/Flick = Utilities
- Liquorland/Super Liquor/Bottle-O/Glengarry = Alcohol
- Uber Eats/DoorDash/Menulog = Dining & takeaway (NOT plain Uber which = Transport)
- NZHL/home loan/mortgage = Mortgage & loan
- Neon/Sky TV/Sky Sport = Subscriptions
- Sharesies/Hatch/InvestNow/Kernel = Transfers to others
- AMI/AA Insurance/State Insurance/Tower = Insurance

INFERENCE:
- "Burger/Grill/Kitchen/Shack/Eatery/Diner/Bistro/Cafe/Coffee/Bakers/Bakery/Sushi/Noodle/Takeaway/Pizza/Taco/Bar/Pub/Tavern" in name → Dining & takeaway (or Alcohol for bar/pub/tavern)
- "Golf/Golfer" in name → Golf
- "Butcher/Deli/Grocer/Meats/Farms/Market" in name → Groceries
- "Pilates/Reformer/Yoga/Gym/Fitness/CrossFit" → Health & medical
- Person's name (Firstname Lastname format) + avg < $100 → Dining & takeaway
- Person's name + avg >= $100 → Transfers to others
- "SP " prefix = Stripe payment, categorise by business name after SP
- "TRANSFER FROM" (positive) → Income
- "INTERNET BANKING TO/IB TRANSFER TO/AUTO PAYMENT TO" → Transfers to others

CRITICAL: NEVER return Misc if ANY reasonable match exists. Pick the closest category.

Merchants:
${merchantList}

Reply ONLY with JSON array: [{"key":"...","category":"..."},...]`,
      },
    ],
  });

  let results: { key: string; category: string }[] = [];
  try {
    const raw = (response.content[0] as { text: string }).text.trim();
    results = JSON.parse(raw);
  } catch {
    console.error("AI categorise parse error:", (response.content[0] as { text: string }).text.slice(0, 300));
  }

  return new Map(results.map((r) => [r.key, r.category as Category]));
}

async function webSearchCategorize(merchantName: string, description: string): Promise<Category | null> {
  const query = merchantName !== "(none)" ? merchantName : description;
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search for what type of New Zealand business "${query}" is, then reply with ONLY one category from this list (exact spelling, nothing else):\n${CATEGORIES.join(", ")}`,
        },
      ],
    });
    const text = res.content.find((b) => b.type === "text")?.text?.trim();
    if (text && CATEGORIES.includes(text as Category)) return text as Category;
  } catch {
    // ignore — web search may be unavailable or quota exceeded
  }
  return null;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reclassifyMisc?: boolean; full?: boolean } = {};
  try { body = await req.json(); } catch { /* no body */ }

  let txnQuery = supabase
    .from("transactions")
    .select("id, description, merchant_name, merchant_website, amount, type, category")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1000);

  if (body.full) {
    txnQuery = txnQuery.neq("category_source", "manual");
  } else if (body.reclassifyMisc) {
    txnQuery = txnQuery.or("category_source.in.(pending,ai),category.eq.Misc");
  } else {
    txnQuery = txnQuery.eq("category_source", "pending");
  }

  const { data: rawTxns } = await txnQuery;
  const pending = (rawTxns ?? []) as (PendingTxn & { category?: string })[];
  if (pending.length === 0) return NextResponse.json({ categorized: 0, bySource: {} });

  // Mutable map keyed by txn id so later passes can override earlier ones
  const updateMap = new Map<string, { id: string; category: string; source: string }>();

  // ── Layer 2: NZ rules engine ──────────────────────────────────────────────
  const stillPending: PendingTxn[] = [];
  for (const t of pending as PendingTxn[]) {
    const ruled = applyRules({
      merchantName: t.merchant_name,
      description: t.description,
      merchantWebsite: t.merchant_website,
      amount: t.amount,
    });
    if (ruled) {
      updateMap.set(t.id, { id: t.id, category: ruled, source: "rules" });
    } else {
      stillPending.push(t);
    }
  }

  // ── Layer 3: Per-user merchant cache ──────────────────────────────────────
  const needsAI: PendingTxn[] = [];
  if (stillPending.length > 0) {
    const merchantKeys = Array.from(new Set(stillPending.map(getMerchantKey)));
    const cacheMap = new Map<string, string>();
    for (let i = 0; i < merchantKeys.length; i += 200) {
      const chunk = merchantKeys.slice(i, i + 200);
      const { data: cached } = await supabase
        .from("merchant_categories")
        .select("merchant_key, category")
        .eq("user_id", user.id)
        .in("merchant_key", chunk);
      for (const row of cached ?? []) cacheMap.set(row.merchant_key, row.category);
    }
    for (const t of stillPending as (PendingTxn & { category?: string })[]) {
      const key = getMerchantKey(t);
      const cached = cacheMap.get(key);
      if (cached && cached !== "Misc") {
        updateMap.set(t.id, { id: t.id, category: cached, source: "ai" });
      } else {
        needsAI.push(t);
      }
    }
  }

  // ── Layer 4: Batch AI (60 merchants per call) ─────────────────────────────
  const grouped = new Map<string, PendingTxn[]>();
  for (const t of needsAI) {
    const key = getMerchantKey(t);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  const merchantEntries = Array.from(grouped.entries());
  const aiMap = new Map<string, Category>();

  for (let i = 0; i < merchantEntries.length; i += AI_BATCH_SIZE) {
    const batch = merchantEntries.slice(i, i + AI_BATCH_SIZE).map(([key, txns]) => ({ key, txns }));
    const result = await batchCategorize(batch);
    result.forEach((v, k) => aiMap.set(k, v));
  }

  const cacheWrites: PromiseLike<unknown>[] = [];
  for (const [key, txns] of merchantEntries) {
    const category = aiMap.get(key) ?? "Misc";
    for (const t of txns) updateMap.set(t.id, { id: t.id, category, source: "ai" });
    cacheWrites.push(
      Promise.resolve(
        supabase.from("merchant_categories").upsert(
          { user_id: user.id, merchant_key: key, category, source: "ai", use_count: txns.length, last_seen_at: new Date().toISOString() },
          { onConflict: "user_id,merchant_key" }
        )
      )
    );
  }
  await Promise.all(cacheWrites);

  // ── Layer 5: Web search for top Misc merchants ────────────────────────────
  // Only runs for merchants AI couldn't identify — sorted by frequency so
  // most-impactful merchants are fixed first. Limited to 25 per run.
  const miscMerchants = merchantEntries
    .filter(([key]) => (aiMap.get(key) ?? "Misc") === "Misc")
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 25);

  if (miscMerchants.length > 0) {
    await Promise.all(
      miscMerchants.map(async ([key, txns]) => {
        const sample = txns[0];
        const cat = await webSearchCategorize(sample.merchant_name ?? "(none)", sample.description);
        if (!cat) return;
        for (const t of txns) updateMap.set(t.id, { id: t.id, category: cat, source: "ai" });
        await supabase.from("merchant_categories").upsert(
          { user_id: user.id, merchant_key: key, category: cat, source: "ai", use_count: txns.length, last_seen_at: new Date().toISOString() },
          { onConflict: "user_id,merchant_key" }
        );
      })
    );
  }

  // ── Apply all updates ─────────────────────────────────────────────────────
  const updates = Array.from(updateMap.values());
  const batchSize = 50;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((u) =>
        supabase
          .from("transactions")
          .update({ category: u.category, category_source: u.source, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .eq("user_id", user.id)
      )
    );
  }

  const bySource = updates.reduce<Record<string, number>>((acc, u) => {
    acc[u.source] = (acc[u.source] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ categorized: updates.length, bySource });
}
