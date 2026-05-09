import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentCycleStart } from "@/lib/pay-cycle";
import { subDays, startOfWeek, addWeeks, isSameWeek, format } from "date-fns";
import AccountsList from "@/components/AccountsList";

export default async function CashFlowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: settings }, { data: accounts }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("pay_frequency, pay_day_of_week, pay_day_of_month, last_pay_date")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("accounts")
      .select("id, name, connection_name, balance, type, is_loan")
      .eq("user_id", user.id),
  ]);

  const totalAvailable = (accounts ?? [])
    .filter((a) => !a.is_loan && (a.balance ?? 0) > 0)
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };

  // ── Pay cycle chart data ─────────────────────────────────────────────────
  const cycleStarts: Date[] = [];
  let cs = currentCycleStart(cycleConfig);
  cycleStarts.push(cs);
  for (let i = 0; i < 5; i++) {
    cs = currentCycleStart(cycleConfig, subDays(cs, 1));
    cycleStarts.push(cs);
  }
  const oldestCycle = cycleStarts[cycleStarts.length - 1];

  // ── Week-on-week: last 8 weeks ───────────────────────────────────────────
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekStarts: Date[] = Array.from({ length: 8 }, (_, i) =>
    addWeeks(thisWeekStart, -i)
  ).reverse();
  const oldestWeek = weekStarts[0];

  const oldest = oldestCycle < oldestWeek ? oldestCycle : oldestWeek;

  const { data: txns } = await supabase
    .from("transactions")
    .select("date, amount, category")
    .eq("user_id", user.id)
    .gte("date", oldest.toISOString())
    .order("date", { ascending: true });

  // ── Bucket by cycle ──────────────────────────────────────────────────────
  const cycleBuckets = cycleStarts
    .map((start, i) => {
      const end = i === 0 ? now : cycleStarts[i - 1];
      const label = i === 0 ? "Now" : format(start, "d MMM");
      const cycleTxns = (txns ?? []).filter((t) => {
        const d = new Date(t.date);
        return d >= start && d < end;
      });
      let income = 0, spending = 0;
      for (const t of cycleTxns) {
        if (t.amount > 0 || t.category === "Income") income += Math.abs(t.amount);
        else if (t.category !== "Transfers to others") spending += Math.abs(t.amount);
      }
      return { label, income, spending, net: income - spending, from: start, to: end };
    })
    .reverse();

  const maxCycleVal = Math.max(...cycleBuckets.map((b) => Math.max(b.income, b.spending)), 1);

  // ── Bucket by week ───────────────────────────────────────────────────────
  const weekBuckets = weekStarts.map((weekStart, i) => {
    const weekEnd = i === weekStarts.length - 1 ? now : weekStarts[i + 1];
    const isCurrent = isSameWeek(weekStart, now, { weekStartsOn: 1 });
    const label = isCurrent ? "This week" : format(weekStart, "d MMM");

    const weekTxns = (txns ?? []).filter((t) => {
      const d = new Date(t.date);
      return d >= weekStart && d < weekEnd && t.amount < 0 &&
        t.category !== "Transfers to others" && t.category !== "Income";
    });

    const total = weekTxns.reduce((s, t) => s + Math.abs(t.amount), 0);

    const byCategory: Record<string, number> = {};
    for (const t of weekTxns) {
      const cat = t.category ?? "Misc";
      byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
    }

    return { label, total, byCategory, isCurrent, from: weekStart, to: weekEnd };
  });

  const maxWeekVal = Math.max(...weekBuckets.map((b) => b.total), 1);

  const thisWeek = weekBuckets[weekBuckets.length - 1];
  const lastWeek = weekBuckets[weekBuckets.length - 2];
  const weekDelta = thisWeek.total - lastWeek.total;
  const weekDeltaPct = lastWeek.total > 0
    ? Math.round((weekDelta / lastWeek.total) * 100)
    : 0;

  const allCats = new Set([
    ...Object.keys(thisWeek.byCategory),
    ...Object.keys(lastWeek.byCategory),
  ]);
  const catDeltas = Array.from(allCats)
    .map((cat) => ({
      cat,
      delta: (thisWeek.byCategory[cat] ?? 0) - (lastWeek.byCategory[cat] ?? 0),
    }))
    .filter((c) => Math.abs(c.delta) > 5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  function fmt(n: number) {
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
  }

  function txnHref(from: Date, to: Date) {
    return `/dashboard/transactions?from=${from.toISOString()}&to=${to.toISOString()}`;
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-xl font-bold text-forest">Cash Flow</h1>

      {/* ── Total available ───────────────────────────────────────────────── */}
      <div className="bg-forest rounded-3xl px-5 py-4 text-white shadow-[0_4px_32px_rgba(22,52,34,0.18)]">
        <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Total available</p>
        <p className="text-4xl font-bold tracking-tight">
          ${totalAvailable.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-white/40 mt-1">across all accounts</p>
      </div>

      {/* ── Accounts ─────────────────────────────────────────────────────── */}
      {accounts && accounts.length > 0 && (
        <section className="space-y-2">
          <AccountsList accounts={accounts} />
        </section>
      )}

      {/* ── Week on week ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Week on week</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            weekDelta <= 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}>
            {weekDelta <= 0 ? "▼" : "▲"} {fmt(Math.abs(weekDelta))} ({Math.abs(weekDeltaPct)}%) vs last week
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-32 mb-3">
            {weekBuckets.map((b) => {
              const h = Math.round((b.total / maxWeekVal) * 128);
              return (
                <Link
                  key={b.label}
                  href={txnHref(b.from, b.to)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="w-full flex items-end" style={{ height: 128 }}>
                    <div
                      className={`w-full rounded-t-lg transition-all group-hover:opacity-70 ${
                        b.isCurrent ? "bg-clay" : "bg-forest/20"
                      }`}
                      style={{ height: Math.max(h, 2) }}
                    />
                  </div>
                  <span className={`text-[9px] text-center leading-tight ${
                    b.isCurrent ? "text-clay font-semibold" : "text-gray-400"
                  }`}>
                    {b.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* This week vs last week totals */}
          <div className="flex gap-3 pt-3 border-t border-gray-50">
            <Link href={txnHref(thisWeek.from, thisWeek.to)} className="flex-1 text-center hover:opacity-70 transition-opacity">
              <p className="text-[10px] text-gray-400 mb-0.5">This week</p>
              <p className="text-base font-bold text-clay">{fmt(thisWeek.total)}</p>
            </Link>
            <div className="w-px bg-gray-100" />
            <Link href={txnHref(lastWeek.from, lastWeek.to)} className="flex-1 text-center hover:opacity-70 transition-opacity">
              <p className="text-[10px] text-gray-400 mb-0.5">Last week</p>
              <p className="text-base font-bold text-forest">{fmt(lastWeek.total)}</p>
            </Link>
          </div>
        </div>

        {/* Category deltas */}
        {catDeltas.length > 0 && (
          <div className="bg-white rounded-2xl px-4 shadow-[0_2px_12px_rgba(22,52,34,0.06)]">
            {catDeltas.map((c, i) => (
              <Link
                key={c.cat}
                href={`/dashboard/transactions?category=${encodeURIComponent(c.cat)}&from=${thisWeek.from.toISOString()}&to=${thisWeek.to.toISOString()}`}
                className={`flex items-center justify-between py-3 hover:opacity-70 transition-opacity ${
                  i < catDeltas.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <span className="text-sm text-forest">{c.cat}</span>
                <span className={`text-sm font-semibold ${
                  c.delta > 0 ? "text-red-500" : "text-emerald-600"
                }`}>
                  {c.delta > 0 ? "+" : "−"}{fmt(Math.abs(c.delta))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Pay cycles ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-1">
          Pay cycles · income vs spending
        </h2>

        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
          <div className="flex gap-4 mb-5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Income
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-forest inline-block" /> Spending
            </span>
          </div>

          <div className="flex items-end gap-2 h-40">
            {cycleBuckets.map((b) => {
              const incomeH = Math.round((b.income / maxCycleVal) * 160);
              const spendH = Math.round((b.spending / maxCycleVal) * 160);
              return (
                <Link
                  key={b.label}
                  href={txnHref(b.from, b.to)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 160 }}>
                    <div
                      className="flex-1 rounded-t-lg bg-emerald-400 transition-all group-hover:opacity-70"
                      style={{ height: incomeH || 2 }}
                    />
                    <div
                      className="flex-1 rounded-t-lg bg-forest transition-all group-hover:opacity-70"
                      style={{ height: spendH || 2 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{b.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl px-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
          {cycleBuckets.map((b, i) => (
            <Link
              key={b.label}
              href={txnHref(b.from, b.to)}
              className={`flex items-center py-3 hover:opacity-70 transition-opacity ${i < cycleBuckets.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <span className="text-xs text-gray-500 w-16 shrink-0">{b.label}</span>
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-emerald-600 font-medium">{fmt(b.income)}</span>
                <span className="text-forest">{fmt(b.spending)}</span>
                <span className={`font-semibold ${b.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {b.net >= 0 ? "+" : ""}{fmt(b.net)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
