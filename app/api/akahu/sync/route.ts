import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getAllTransactions, refreshAccounts, extractBalance, AkahuTransaction } from "@/lib/akahu";
import { mapAkahuCategory, applyRules } from "@/lib/categorize";
import { subDays } from "date-fns";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("akahu_user_token")
    .eq("user_id", user.id)
    .single();

  if (!settings?.akahu_user_token) {
    return NextResponse.json({ error: "No Akahu token" }, { status: 400 });
  }

  const token = settings.akahu_user_token;

  await refreshAccounts(token);

  // Sync accounts
  const akahuAccounts = await getAccounts(token);
  const accountRows = akahuAccounts.map((a) => ({
    id: a._id,
    user_id: user.id,
    name: a.name,
    formatted_account: a.formatted_account ?? null,
    type: a.type,
    balance: extractBalance(a.balance),
    currency: a.currency ?? "NZD",
    connection_name: a.connection?.name ?? null,
    is_loan: (() => {
      const bal = extractBalance(a.balance);
      return (
        a.type === "LOAN" ||
        a.name.toLowerCase().includes("loan") ||
        a.name.toLowerCase().includes("mortgage") ||
        (bal !== null && bal < -10000)
      );
    })(),
    last_synced: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  if (accountRows.length > 0) {
    const { error: accErr } = await supabase.from("accounts").upsert(accountRows, { onConflict: "id" });
    if (accErr) console.error("accounts upsert error:", accErr);
  }

  // Sync transactions — default 12 months; pass ?days=730 for 2 years
  const daysBack = 365;
  const startDate = subDays(new Date(), daysBack);
  const akahuTxns = await getAllTransactions(token, startDate);

  // Build categorised rows using Akahu enrichment → rules → pending
  const txnIds = akahuTxns.map((t) => t._id);

  // Preserve categories that have already been set by ai/rules/manual (don't regress on re-sync)
  const preservedMap = new Map<string, { category: string; source: string }>();
  if (txnIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < txnIds.length; i += chunkSize) {
      const chunk = txnIds.slice(i, i + chunkSize);
      const { data } = await supabase
        .from("transactions")
        .select("id, category, category_source")
        .eq("user_id", user.id)
        .in("id", chunk)
        .in("category_source", ["ai", "rules", "manual"]);
      for (const row of data ?? []) {
        preservedMap.set(row.id, { category: row.category, source: row.category_source });
      }
    }
  }

  const txnRows = akahuTxns.map((t) => {
    const isPending = (t as AkahuTransaction & { isPending?: boolean }).isPending === true;
    const preserved = preservedMap.get(t._id);

    let category: string | null = null;
    let categorySource = "pending";

    if (preserved) {
      // Keep AI/rules/manual categorisations across re-syncs
      category = preserved.category;
      categorySource = preserved.source;
    } else {
      // Layer 1: Akahu's personal_finance enrichment
      const akahuCategoryName = t.category?.groups?.personal_finance?.name ?? null;
      const mapped = akahuCategoryName ? mapAkahuCategory(akahuCategoryName) : null;
      if (mapped) {
        category = mapped;
        categorySource = "akahu";
      } else {
        // Layer 2: NZ rules engine
        const ruled = applyRules({
          merchantName: t.merchant?.name,
          description: t.description,
          merchantWebsite: t.merchant?.website,
          amount: t.amount,
        });
        if (ruled) {
          category = ruled;
          categorySource = "rules";
        }
      }
    }

    return {
      id: t._id,
      user_id: user.id,
      account_id: t._account,
      date: t.date,
      description: t.description,
      merchant_name: t.merchant?.name ?? null,
      merchant_website: t.merchant?.website ?? null,
      amount: t.amount,
      category,
      category_source: categorySource,
      is_pending: isPending,
      raw_data: t,
      updated_at: new Date().toISOString(),
    };
  });

  // Deduplicate by id (Akahu can return the same txn across pages during pagination)
  const dedupedTxns = Array.from(new Map(txnRows.map((r) => [r.id, r])).values());

  if (dedupedTxns.length > 0) {
    const { error: txnErr } = await supabase.from("transactions").upsert(dedupedTxns, { onConflict: "id" });
    if (txnErr) console.error("transactions upsert error:", txnErr);
  }

  // Mark onboarded
  await supabase
    .from("user_settings")
    .update({ onboarded: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  const categorised = txnRows.filter((r) => r.category_source !== "pending").length;
  const pending = txnRows.filter((r) => r.category_source === "pending").length;

  // Auto-run full categorization after every sync so all transactions get processed
  const origin = new URL(req.url).origin;
  await fetch(`${origin}/api/ai/categorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": req.headers.get("Cookie") ?? "",
    },
    body: JSON.stringify({ full: true }),
  });

  return NextResponse.json({
    accounts: accountRows.length,
    transactions: txnRows.length,
    categorised,
    pending,
  });
}
