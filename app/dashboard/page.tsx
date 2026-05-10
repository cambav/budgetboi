import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentCycleStart, daysUntilNextPay } from "@/lib/pay-cycle";
import { format, startOfMonth, startOfWeek } from "date-fns";
import SafeToSpend from "@/components/SafeToSpend";
import SpendingBreakdown from "@/components/SpendingBreakdown";
import AccountsList from "@/components/AccountsList";
import InsightCards from "@/components/InsightCards";
import TransactionList from "@/components/TransactionList";
import SyncButton from "@/components/SyncButton";
import PeriodToggle from "@/components/PeriodToggle";
import SpendTrajectory from "@/components/SpendTrajectory";
import BillCalendar from "@/components/BillCalendar";
import SubscriptionAudit from "@/components/SubscriptionAudit";
import { Suspense } from "react";

type Period = "cycle" | "week" | "month";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const period = (searchParams?.period ?? "cycle") as Period;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if Akahu is connected
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!settings?.akahu_token_id && !settings?.akahu_user_token) {
    redirect("/settings?onboard=1");
  }

  const cycleConfig = {
    pay_frequency: (settings.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings.pay_day_of_week ?? 5,
    pay_day_of_month: settings.pay_day_of_month ?? 15,
    last_pay_date: settings.last_pay_date ?? null,
  };
  const cycleStart = currentCycleStart(cycleConfig);
  const daysLeft = daysUntilNextPay(cycleConfig);

  const now = new Date();
  const periodStart =
    period === "week"
      ? startOfWeek(now, { weekStartsOn: 1 }) // Monday
      : period === "month"
      ? startOfMonth(now)
      : cycleStart;

  const periodLabel =
    period === "week"
      ? `week from ${format(periodStart, "d MMM")}`
      : period === "month"
      ? format(now, "MMMM")
      : `cycle since ${format(cycleStart, "d MMM")}`;

  const [{ data: accounts }, { data: recentTxns }, { data: cycleTxns }, { data: budgets }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, connection_name, balance, type, is_loan")
        .eq("user_id", user.id)
        .order("connection_name"),
      supabase
        .from("transactions")
        .select("id, date, description, merchant_name, amount, category, is_pending")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(15),
      supabase
        .from("transactions")
        .select("amount, category")
        .eq("user_id", user.id)
        .gte("date", periodStart.toISOString())
        .lt("amount", 0),
      supabase
        .from("budgets")
        .select("category, limit_amount")
        .eq("user_id", user.id),
    ]);

  // Spending by category this cycle
  const byCategory: Record<string, number> = {};
  for (const t of cycleTxns ?? []) {
    const cat = t.category ?? "Misc";
    byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
  }
  const categoryData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const totalSpend = categoryData.reduce((s, c) => s + c.amount, 0);

  // Budget alerts: categories that are >= 90% of limit
  const budgetAlerts = (budgets ?? [])
    .map((b) => ({ ...b, actual: byCategory[b.category] ?? 0 }))
    .filter((b) => b.actual >= b.limit_amount * 0.9)
    .sort((a, b) => b.actual / b.limit_amount - a.actual / a.limit_amount)
    .slice(0, 3);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 lg:px-6 lg:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-forest lg:text-2xl">budgetboi</h1>
          <p className="text-xs text-gray-400">
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} until pay · {periodLabel}
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Period selector */}
      <Suspense fallback={null}>
        <PeriodToggle current={period} />
      </Suspense>

      {/* Safe to spend — AI-native hero card (full width) */}
      <SafeToSpend />

      {/* Desktop 2-column grid */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
        {/* Left column */}
        <div className="space-y-4">
          {/* Spending breakdown */}
          {categoryData.length > 0 && (
            <SpendingBreakdown data={categoryData} totalSpend={totalSpend} periodLabel={periodLabel} />
          )}

          {/* Spend trajectory */}
          <SpendTrajectory />

          {/* AI Chat shortcut */}
          <a
            href="/dashboard/chat"
            className="flex items-center gap-3 bg-forest/5 border border-forest/10 rounded-2xl px-4 py-3 hover:bg-forest/10 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.3-1.4A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z" fill="#163422"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-forest">Ask AI anything</p>
              <p className="text-xs text-gray-400">Chat about your spending, budgets, patterns</p>
            </div>
            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </a>

          {/* AI Insights */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
              AI Insights
            </h2>
            <InsightCards />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Budget alerts */}
          {budgetAlerts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Budgets</h2>
                <a href="/dashboard/budgets" className="text-xs text-clay">Manage</a>
              </div>
              <div className="bg-white rounded-3xl px-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
                {budgetAlerts.map((b, i) => {
                  const pct = Math.min((b.actual / b.limit_amount) * 100, 100);
                  const over = b.actual > b.limit_amount;
                  return (
                    <div key={b.category} className={`py-3 ${i < budgetAlerts.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-forest">{b.category}</span>
                        <span className={over ? "text-red-500 font-semibold" : "text-amber-600"}>
                          ${Math.round(b.actual)} / ${Math.round(b.limit_amount)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${over ? "bg-red-400" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming bills */}
          <BillCalendar />

          {/* Subscription audit */}
          <SubscriptionAudit />

          {/* Accounts */}
          {accounts && accounts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
                Accounts
              </h2>
              <AccountsList accounts={accounts} />
            </section>
          )}

          {/* Recent transactions */}
          {recentTxns && recentTxns.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Recent</h2>
                <a href="/dashboard/transactions" className="text-xs text-clay">See all</a>
              </div>
              <div className="bg-white rounded-3xl px-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
                <TransactionList transactions={recentTxns} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
