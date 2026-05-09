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
  // fallback: first 40 chars of normalised description
  return normalizeKey(t.description).slice(0, 40);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reclassifyMisc?: boolean; full?: boolean } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  // full=true → re-process ALL transactions except manual user edits
  // reclassifyMisc=true → also re-process Misc-tagged transactions
  // default → only pending
  let txnQuery = supabase
    .from("transactions")
    .select("id, description, merchant_name, merchant_website, amount, type, category")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1000);

  if (body.full) {
    // Everything except what the user manually set
    txnQuery = txnQuery.neq("category_source", "manual");
  } else if (body.reclassifyMisc) {
    // Pending + AI-categorised + anything labelled Misc
    txnQuery = txnQuery.or("category_source.in.(pending,ai),category.eq.Misc");
  } else {
    txnQuery = txnQuery.eq("category_source", "pending");
  }

  const { data: rawTxns } = await txnQuery;
  const pending = (rawTxns ?? []) as (PendingTxn & { category?: string })[];

  if (pending.length === 0) {
    return NextResponse.json({ categorized: 0, bySource: {} });
  }

  const updates: { id: string; category: string; source: string }[] = [];
  const stillPending: PendingTxn[] = [];

  // ── Layer 2: NZ rules engine (catches anything missed during sync) ─────────
  for (const t of pending as PendingTxn[]) {
    const ruled = applyRules({
      merchantName: t.merchant_name,
      description: t.description,
      merchantWebsite: t.merchant_website,
      amount: t.amount,
    });
    if (ruled) {
      updates.push({ id: t.id, category: ruled, source: "rules" });
    } else {
      stillPending.push(t);
    }
  }

  // ── Layer 3: Per-user merchant cache ──────────────────────────────────────
  const needsAI: PendingTxn[] = [];
  if (stillPending.length > 0) {
    const merchantKeys = Array.from(new Set(stillPending.map(getMerchantKey)));

    const chunkSize = 200;
    const cacheMap = new Map<string, string>();
    for (let i = 0; i < merchantKeys.length; i += chunkSize) {
      const chunk = merchantKeys.slice(i, i + chunkSize);
      const { data: cached } = await supabase
        .from("merchant_categories")
        .select("merchant_key, category")
        .eq("user_id", user.id)
        .in("merchant_key", chunk);
      for (const row of cached ?? []) {
        cacheMap.set(row.merchant_key, row.category);
      }
    }

    for (const t of stillPending as (PendingTxn & { category?: string })[]) {
      const key = getMerchantKey(t);
      const cached = cacheMap.get(key);
      // Skip Misc cache entries when reclassifying — force AI to re-evaluate
      if (cached && cached !== "Misc") {
        updates.push({ id: t.id, category: cached, source: "ai" }); // cached AI result
      } else {
        needsAI.push(t);
      }
    }
  }

  // ── Layer 4: AI (grouped by merchant to minimise calls) ───────────────────
  if (needsAI.length > 0) {
    // Group by merchant key — categorise each unique merchant once
    const grouped = new Map<string, PendingTxn[]>();
    for (const t of needsAI) {
      const key = getMerchantKey(t);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    // Build a compact list of unique merchants with sample context
    const merchantList = Array.from(grouped.entries())
      .map(([key, txns]) => {
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
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are categorising NZ bank transactions for a personal finance app.
Assign each merchant to exactly one category.

CATEGORIES available: ${CATEGORIES.join(", ")}

NZ-SPECIFIC MERCHANTS:
- Pak'nSave/Countdown/New World/Woolworths/Four Square = Groceries
- Z Energy/BP/Mobil/Gull/Caltex = Fuel
- Spark/Vodafone/2degrees/One NZ/Slingshot/Orcon/Bigpipe = Phone & internet
- Contact/Genesis/Mercury/Meridian/Trustpower/Vector/Flick = Utilities
- Liquorland/Super Liquor/Bottle-O/Glengarry = Alcohol
- Uber Eats/DoorDash/Menulog = Dining & takeaway (NOT plain Uber)
- Uber (no "eats") = Transport
- NZHL/any home loan/mortgage = Mortgage & loan
- Neon = Subscriptions (NZ TV streaming service)
- Sky TV/Sky Sport = Subscriptions
- Sharesies/Hatch/InvestNow/Kernel = Transfers to others
- AMI/AA Insurance/State Insurance/Tower = Insurance

INFERENCE RULES — infer category from merchant name structure:
- Name contains "Burger", "Grill", "Kitchen", "Shack", "Eatery", "Diner", "Bistro", "Cafe", "Coffee", "Bakers", "Bakery", "Sushi", "Noodle", "Takeaway", "Fish & Chips", "Pizza", "Taco" → Dining & takeaway
- Name contains "Golf", "Golfer" → Golf
- Name contains "Butcher", "Butchery", "Deli", "Grocer", "Meats", "Farms", "Market" (food context) → Groceries
- Name contains "Pilates", "Reformer", "Yoga", "Gym", "Fitness", "CrossFit" → Health & medical
- Name contains "Cinema", "Movies", "Theatre" → Misc (no Entertainment category)
- "TRANSFER FROM [name]" with positive amount → Income
- "PAY [name]" = payment to a person or service → depends on context (cleaning = Misc, food = Dining)
- Name sounds like a person's name (Freida Margolis, Porter James) + small amount → Dining & takeaway (vendor/market stall)
- Name sounds like a person's name + large amount ($100+) → Transfers to others
- "SP " prefix = Stripe payment (card processor), look at the actual business name after "SP"
- "POS W/D SP" = point of sale, look at business name
- Unknown NZ business name ending in "Ltd", "Limited" → use context clues; if food/hospitality → Dining

CRITICAL RULES:
1. NEVER return "Misc" if there is ANY reasonable category match
2. When uncertain between two categories, pick the more specific one
3. Small recurring amounts ($10-50/month) with software/media names → Subscriptions
4. "TRANSFER FROM [name]" (positive/incoming) → Income
5. "INTERNET BANKING TO", "IB TRANSFER TO", "AUTO PAYMENT TO" (outgoing) → Transfers to others

Merchants to categorise:
${merchantList}

Respond ONLY with a JSON array: [{"key":"...","category":"..."},...]
No explanation, no markdown fences.`,
        },
      ],
    });

    let aiResults: { key: string; category: string }[] = [];
    try {
      const raw = (response.content[0] as { text: string }).text.trim();
      aiResults = JSON.parse(raw);
    } catch {
      // Partial failure — still apply what we have from rules/cache
      console.error("AI categorise parse error:", (response.content[0] as { text: string }).text);
    }

    const aiMap = new Map(aiResults.map((r) => [r.key, r.category as Category]));

    // Apply AI results to all transactions with that merchant key
    const cacheWrites: PromiseLike<unknown>[] = [];
    for (const [key, txns] of Array.from(grouped.entries())) {
      const category = aiMap.get(key) ?? "Misc";
      for (const t of txns) {
        updates.push({ id: t.id, category, source: "ai" });
      }
      // Cache the result so future syncs don't need to ask AI again
      cacheWrites.push(
        Promise.resolve(
          supabase.from("merchant_categories").upsert(
            {
              user_id: user.id,
              merchant_key: key,
              category,
              source: "ai",
              use_count: txns.length,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "user_id,merchant_key" }
          )
        )
      );
    }
    await Promise.all(cacheWrites);
  }

  // ── Apply all updates in batches ──────────────────────────────────────────
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

  // Tally by source for the response
  const bySource = updates.reduce<Record<string, number>>((acc, u) => {
    acc[u.source] = (acc[u.source] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ categorized: updates.length, bySource });
}
