import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentCycleStart } from "@/lib/pay-cycle";
import { subMonths, startOfMonth, format } from "date-fns";
import BudgetsClient from "@/components/BudgetsClient";

export default async function BudgetsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  const cycleStart = currentCycleStart(cycleConfig);

  const threeMonthsAgo = startOfMonth(subMonths(new Date(), 3));

  const [{ data: budgets }, { data: cycleTxns }, { data: historyTxns }] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, category, limit_amount")
      .eq("user_id", user.id)
      .order("category"),
    supabase
      .from("transactions")
      .select("amount, category")
      .eq("user_id", user.id)
      .gte("date", cycleStart.toISOString())
      .lt("amount", 0),
    supabase
      .from("transactions")
      .select("date, amount, category")
      .eq("user_id", user.id)
      .gte("date", threeMonthsAgo.toISOString())
      .lt("amount", 0),
  ]);

  const spending: Record<string, number> = {};
  for (const t of cycleTxns ?? []) {
    if (!t.category || t.category === "Income" || t.category === "Transfers to others") continue;
    spending[t.category] = (spending[t.category] ?? 0) + Math.abs(t.amount);
  }

  // Monthly totals per category for the last 3 months (for wizard suggestions)
  const monthlyHistory: Record<string, number[]> = {};
  for (const t of historyTxns ?? []) {
    if (!t.category || t.category === "Income" || t.category === "Transfers to others") continue;
    const monthIdx = Math.floor(
      (new Date().getTime() - startOfMonth(new Date(t.date)).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44)
    );
    const idx = Math.min(Math.max(0, monthIdx), 2); // clamp to 0-2
    if (!monthlyHistory[t.category]) monthlyHistory[t.category] = [0, 0, 0];
    monthlyHistory[t.category][idx] = (monthlyHistory[t.category][idx] ?? 0) + Math.abs(t.amount);
  }

  // Average monthly spend per category (for wizard suggestion)
  const avgMonthly: Record<string, number> = {};
  for (const [cat, months] of Object.entries(monthlyHistory)) {
    const nonZero = months.filter((v) => v > 0);
    if (nonZero.length > 0) {
      avgMonthly[cat] = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
    }
  }

  // Month labels for display
  const now = new Date();
  const monthLabels = [
    format(now, "MMM"),
    format(subMonths(now, 1), "MMM"),
    format(subMonths(now, 2), "MMM"),
  ];

  return (
    <BudgetsClient
      initialBudgets={budgets ?? []}
      initialSpending={spending}
      cycleStart={cycleStart.toISOString()}
      avgMonthly={avgMonthly}
      monthLabels={monthLabels}
      monthlyHistory={monthlyHistory}
    />
  );
}
