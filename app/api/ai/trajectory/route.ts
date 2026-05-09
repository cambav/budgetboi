import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentCycleStart, nextPayday } from "@/lib/pay-cycle";
import { subDays, differenceInDays } from "date-fns";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("pay_frequency, pay_day_of_week, pay_day_of_month, last_pay_date")
    .eq("user_id", user.id)
    .single();

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };

  const now = new Date();
  const cycleStart = currentCycleStart(cycleConfig, now);
  const cycleEnd = nextPayday(cycleStart, cycleConfig);
  const cycleLengthDays = differenceInDays(cycleEnd, cycleStart);
  const daysElapsed = Math.max(1, differenceInDays(now, cycleStart));

  // Fetch 4 cycles of spend
  const lookback = subDays(cycleStart, cycleLengthDays * 3 + 1);
  const { data: txns } = await supabase
    .from("transactions")
    .select("date, amount, category")
    .eq("user_id", user.id)
    .gte("date", lookback.toISOString())
    .lt("amount", 0)
    .eq("is_pending", false);

  const allTxns = txns ?? [];

  // Current cycle spend
  const currentTxns = allTxns.filter((t) => new Date(t.date) >= cycleStart);
  const currentSpend = currentTxns.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Historical: split into previous 3 cycles
  const cycleTotals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const from = subDays(cycleStart, cycleLengthDays * i);
    const to = subDays(cycleStart, cycleLengthDays * (i - 1));
    const cycleSpend = allTxns
      .filter((t) => {
        const d = new Date(t.date);
        return d >= from && d < to;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    if (cycleSpend > 0) cycleTotals.push(cycleSpend);
  }

  const historicalAvg =
    cycleTotals.length > 0
      ? cycleTotals.reduce((s, n) => s + n, 0) / cycleTotals.length
      : null;

  // Daily rate and projection
  const dailyRate = currentSpend / daysElapsed;
  const projectedTotal = dailyRate * cycleLengthDays;

  // Category breakdown for current cycle
  const byCat: Record<string, number> = {};
  for (const t of currentTxns) {
    const cat = t.category ?? "Misc";
    byCat[cat] = (byCat[cat] ?? 0) + Math.abs(t.amount);
  }
  const categories = Object.entries(byCat)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return NextResponse.json({
    currentSpend: Math.round(currentSpend),
    projectedTotal: Math.round(projectedTotal),
    historicalAvg: historicalAvg !== null ? Math.round(historicalAvg) : null,
    daysElapsed,
    cycleLengthDays,
    dailyRate: Math.round(dailyRate),
    categories,
    trajectory: projectedTotal > (historicalAvg ?? projectedTotal) * 1.1 ? "over" : "on_track",
  });
}
