"use client";

import { useEffect, useState } from "react";

interface Insight {
  insight_type: string;
  title: string;
  content: string;
}

const TYPE_ICON: Record<string, string> = {
  subscription_audit: "📦",
  spending_pattern: "📈",
  weekly_summary: "📅",
  nudge: "💡",
};

export default function InsightCards() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/insights")
      .then((r) => r.json())
      .then((d) => setInsights(d.insights ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-full mb-1" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!insights.length) return null;

  return (
    <div className="space-y-3">
      {insights.map((ins, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(22,52,34,0.06)]">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 shrink-0">
              {TYPE_ICON[ins.insight_type] ?? "✨"}
            </span>
            <div>
              <p className="text-sm font-semibold text-forest mb-1">{ins.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{ins.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
