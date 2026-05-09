"use client";

import { useEffect, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";

interface Bill {
  name: string;
  amount: number;
  nextDate: string;
  interval: number;
  category: string | null;
}

export default function BillCalendar() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/bills")
      .then((r) => r.json())
      .then((d) => setBills(d.bills ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BillShimmer />;
  if (bills.length === 0) return null;

  const now = new Date();

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(22,52,34,0.06)] overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="font-semibold text-forest text-sm">Upcoming Bills</h3>
        <span className="text-xs text-gray-400">Next 30 days</span>
      </div>
      <div className="px-4 pb-4 space-y-1">
        {bills.map((bill, i) => {
          const date = parseISO(bill.nextDate);
          const daysAway = differenceInDays(date, now);
          const urgent = daysAway <= 3;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${urgent ? "bg-red-50" : "bg-parchment/60"}`}
            >
              <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 ${urgent ? "bg-red-100" : "bg-sand"}`}>
                <span className="text-[10px] font-bold leading-none text-gray-500">
                  {format(date, "MMM").toUpperCase()}
                </span>
                <span className={`text-base font-bold leading-tight ${urgent ? "text-red-500" : "text-forest"}`}>
                  {format(date, "d")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest truncate">{bill.name}</p>
                <p className="text-xs text-gray-400">
                  {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `in ${daysAway} days`}
                  {" · "}
                  {bill.interval === 7 ? "weekly" : bill.interval === 14 ? "fortnightly" : "monthly"}
                </p>
              </div>
              <span className={`text-sm font-semibold shrink-0 ${urgent ? "text-red-500" : "text-forest"}`}>
                ${bill.amount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillShimmer() {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 mb-3">
          <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
