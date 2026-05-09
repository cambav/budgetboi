import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subDays, addDays, differenceInDays, format } from "date-fns";

interface TxnRow {
  date: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
}

function detectInterval(dates: Date[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(differenceInDays(sorted[i], sorted[i - 1]));
  }
  const avg = gaps.reduce((s, n) => s + n, 0) / gaps.length;
  // Snap to standard intervals
  if (avg <= 9) return 7;
  if (avg <= 18) return 14;
  if (avg <= 45) return 28;
  return null;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = subDays(new Date(), 90);
  const { data: txns } = await supabase
    .from("transactions")
    .select("date, description, merchant_name, amount, category")
    .eq("user_id", user.id)
    .gte("date", since.toISOString())
    .lt("amount", 0)
    .eq("is_pending", false)
    .order("date", { ascending: true });

  const all = (txns ?? []) as TxnRow[];

  // Group by merchant or cleaned description
  const groups = new Map<string, TxnRow[]>();
  for (const t of all) {
    const key = (t.merchant_name ?? t.description ?? "").toLowerCase().trim().slice(0, 40);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(t);
    groups.set(key, existing);
  }

  const now = new Date();
  const horizon = addDays(now, 30);

  const upcoming: {
    name: string;
    amount: number;
    nextDate: string;
    interval: number;
    category: string | null;
  }[] = [];

  for (const entries of Array.from(groups.values())) {
    if (entries.length < 2) continue;
    const dates = entries.map((e) => new Date(e.date));
    const interval = detectInterval(dates);
    if (!interval) continue;

    const lastDate = dates.reduce((a, b) => (a > b ? a : b));
    const nextDate = addDays(lastDate, interval);

    if (nextDate <= now || nextDate > horizon) continue;

    const avgAmount = entries.reduce((s, e) => s + Math.abs(e.amount), 0) / entries.length;
    const name = entries[0].merchant_name ?? entries[0].description ?? "Unknown";

    upcoming.push({
      name,
      amount: Math.round(avgAmount),
      nextDate: format(nextDate, "yyyy-MM-dd"),
      interval,
      category: entries[0].category,
    });
  }

  upcoming.sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  return NextResponse.json({ bills: upcoming });
}
