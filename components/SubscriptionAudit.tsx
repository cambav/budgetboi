"use client";

import { useEffect, useState } from "react";

interface Subscription {
  name: string;
  amount: number;
  monthlyAmount: number;
  frequency: "weekly" | "fortnightly" | "monthly" | "annual";
  category: string | null;
  lastCharged: string;
  occurrences: number;
}

const FREQ_LABEL: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  annual: "Annual",
};

export default function SubscriptionAudit() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/ai/subscriptions")
      .then((r) => r.json())
      .then((d) => {
        setSubs(d.subscriptions ?? []);
        setTotalMonthly(d.totalMonthly ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SubShimmer />;
  if (subs.length === 0) return null;

  const visible = expanded ? subs : subs.slice(0, 4);

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(22,52,34,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-forest text-sm">Subscriptions</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subs.length} recurring charges</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Monthly total</p>
          <p className="text-base font-bold text-forest">${totalMonthly}/mo</p>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-2">
        {visible.map((sub, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 ${i < visible.length - 1 ? "border-b border-gray-50" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl bg-parchment flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-clay">{sub.name[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forest truncate">{sub.name}</p>
              <p className="text-xs text-gray-400">{FREQ_LABEL[sub.frequency]} · ${sub.amount}</p>
            </div>
            <span className="text-sm font-semibold text-forest shrink-0">${sub.monthlyAmount}/mo</span>
          </div>
        ))}
      </div>

      {subs.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 text-xs font-semibold text-clay text-center border-t border-gray-50 hover:bg-parchment/50 transition-colors"
        >
          {expanded ? "Show less" : `Show ${subs.length - 4} more`}
        </button>
      )}
    </div>
  );
}

function SubShimmer() {
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
          <div className="h-3 bg-gray-100 rounded w-12 self-center" />
        </div>
      ))}
    </div>
  );
}
