import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, subMonths, format } from "date-fns";

const EXCLUDED = new Set(["Income", "Transfers to others", "Misc"]);

function fmt(n: number) {
  if (n === 0) return "–";
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
}

export default async function TrendsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  // Last 6 calendar months (oldest first)
  const months = Array.from({ length: 6 }, (_, i) =>
    startOfMonth(subMonths(now, 5 - i))
  );
  const oldest = months[0];

  const { data: txns } = await supabase
    .from("transactions")
    .select("date, amount, category")
    .eq("user_id", user.id)
    .gte("date", oldest.toISOString())
    .lt("amount", 0);

  // Bucket by month+category
  const buckets: Record<string, Record<string, number>> = {};
  for (const t of txns ?? []) {
    const monthKey = format(new Date(t.date), "yyyy-MM");
    const cat = t.category ?? "Misc";
    if (EXCLUDED.has(cat)) continue;
    if (!buckets[monthKey]) buckets[monthKey] = {};
    buckets[monthKey][cat] = (buckets[monthKey][cat] ?? 0) + Math.abs(t.amount);
  }

  // All categories seen
  const allCats = Array.from(
    new Set(Object.values(buckets).flatMap((b) => Object.keys(b)))
  );

  // Compute total per category (for sorting)
  const catTotals = allCats.map((cat) => ({
    cat,
    total: months.reduce(
      (s, m) => s + (buckets[format(m, "yyyy-MM")]?.[cat] ?? 0),
      0
    ),
  }));
  catTotals.sort((a, b) => b.total - a.total);

  const monthLabels = months.map((m) => format(m, "MMM"));
  const thisMonthKey = format(now, "yyyy-MM");
  const lastMonthKey = format(subMonths(now, 1), "yyyy-MM");

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-forest">Trends</h1>
        <p className="text-xs text-gray-400">Month-on-month spend per category</p>
      </div>

      {catTotals.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-[0_4px_32px_rgba(22,52,34,0.06)] text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold text-forest mb-1">No data yet</p>
          <p className="text-sm text-gray-400">Sync your transactions to see trends.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {catTotals.map(({ cat }) => {
            const vals = months.map(
              (m) => buckets[format(m, "yyyy-MM")]?.[cat] ?? 0
            );
            const maxVal = Math.max(...vals, 1);
            const thisMonth = buckets[thisMonthKey]?.[cat] ?? 0;
            const lastMonth = buckets[lastMonthKey]?.[cat] ?? 0;
            const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
            const up = delta > 5;
            const down = delta < -5;

            return (
              <div key={cat} className="bg-white rounded-3xl p-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-forest text-sm">{cat}</span>
                  <div className="flex items-center gap-1.5">
                    {thisMonth > 0 && (
                      <span className="text-sm font-medium text-forest">{fmt(thisMonth)}</span>
                    )}
                    {(up || down) && (
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          up ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {up ? "▲" : "▼"} {Math.abs(Math.round(delta))}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini bar chart */}
                <div className="flex items-end gap-1 h-12">
                  {vals.map((v, i) => {
                    const h = Math.round((v / maxVal) * 48);
                    const isCurrentMonth = format(months[i], "yyyy-MM") === thisMonthKey;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            isCurrentMonth ? "bg-forest" : "bg-forest/25"
                          }`}
                          style={{ height: h || 2 }}
                          title={`${monthLabels[i]}: ${fmt(v)}`}
                        />
                        <span className="text-[9px] text-gray-400">{monthLabels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
