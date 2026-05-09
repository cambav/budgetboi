"use client";

import { useEffect, useState } from "react";

interface SafeToSpendData {
  amount: number;
  reasoning: string;
  status: "comfortable" | "watch it" | "tight";
  breakdown?: {
    available: number;
    pending: number;
    cycle_spend: number;
    days_left: number;
  };
}

const statusColors = {
  comfortable: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "watch it":  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  tight:       { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
};

export default function SafeToSpend() {
  const [data, setData] = useState<SafeToSpendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/safe-to-spend")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_32px_rgba(22,52,34,0.06)] animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
        <div className="h-10 bg-gray-100 rounded w-48 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  const colors = statusColors[data.status] ?? statusColors["watch it"];

  return (
    <div className="bg-forest rounded-3xl p-6 text-white">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
          Safe to spend today
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {data.status}
        </span>
      </div>
      <p className="text-4xl font-bold tracking-tight mb-3">
        ${data.amount.toFixed(0)}
        <span className="text-lg font-normal text-white/50 ml-1">NZD</span>
      </p>

      {data.breakdown && (
        <div className="flex gap-3 mb-3 text-xs text-white/50 border-t border-white/10 pt-3">
          <span>
            <span className="text-white/80 font-medium">${data.breakdown.available.toLocaleString("en-NZ")}</span> available
          </span>
          {data.breakdown.pending > 0 && (
            <span>
              <span className="text-white/80 font-medium">−${data.breakdown.pending.toLocaleString("en-NZ")}</span> pending
            </span>
          )}
          <span>
            <span className="text-white/80 font-medium">${data.breakdown.cycle_spend.toLocaleString("en-NZ")}</span> spent this cycle
          </span>
          <span>
            <span className="text-white/80 font-medium">{data.breakdown.days_left}d</span> to pay
          </span>
        </div>
      )}

      <p className="text-sm text-white/70 leading-relaxed">{data.reasoning}</p>
    </div>
  );
}
