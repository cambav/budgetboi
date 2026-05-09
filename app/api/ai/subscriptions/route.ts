import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subDays, differenceInDays } from "date-fns";

interface TxnRow {
  date: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = subDays(new Date(), 120);
  const { data: txns } = await supabase
    .from("transactions")
    .select("date, description, merchant_name, amount, category")
    .eq("user_id", user.id)
    .gte("date", since.toISOString())
    .lt("amount", 0)
    .eq("is_pending", false)
    .order("date", { ascending: true });

  const all = (txns ?? []) as TxnRow[];

  // Group by merchant/description key
  const groups = new Map<string, TxnRow[]>();
  for (const t of all) {
    const key = (t.merchant_name ?? t.description ?? "").toLowerCase().trim().slice(0, 40);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(t);
    groups.set(key, existing);
  }

  const subscriptions: {
    name: string;
    amount: number;
    monthlyAmount: number;
    frequency: "weekly" | "fortnightly" | "monthly" | "annual";
    category: string | null;
    lastCharged: string;
    occurrences: number;
  }[] = [];

  for (const entries of Array.from(groups.values())) {
    if (entries.length < 2) continue;

    // Check amount consistency (variance < 10%)
    const amounts = entries.map((e) => Math.abs(e.amount));
    const avg = amounts.reduce((s, n) => s + n, 0) / amounts.length;
    const variance = amounts.reduce((s, n) => s + Math.abs(n - avg), 0) / amounts.length;
    if (variance / avg > 0.1) continue; // not consistent enough

    // Detect interval
    const dates = entries.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push(differenceInDays(dates[i], dates[i - 1]));
    }
    const avgGap = gaps.reduce((s, n) => s + n, 0) / gaps.length;

    let frequency: "weekly" | "fortnightly" | "monthly" | "annual";
    let monthlyAmount: number;

    if (avgGap <= 9) {
      frequency = "weekly";
      monthlyAmount = avg * 4.33;
    } else if (avgGap <= 18) {
      frequency = "fortnightly";
      monthlyAmount = avg * 2.17;
    } else if (avgGap <= 45) {
      frequency = "monthly";
      monthlyAmount = avg;
    } else if (avgGap <= 400) {
      frequency = "annual";
      monthlyAmount = avg / 12;
    } else {
      continue;
    }

    const name = entries[0].merchant_name ?? entries[0].description ?? "Unknown";
    const lastCharged = dates[dates.length - 1].toISOString().slice(0, 10);

    subscriptions.push({
      name,
      amount: Math.round(avg),
      monthlyAmount: Math.round(monthlyAmount),
      frequency,
      category: entries[0].category,
      lastCharged,
      occurrences: entries.length,
    });
  }

  subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyAmount, 0);

  return NextResponse.json({ subscriptions, totalMonthly: Math.round(totalMonthly) });
}
