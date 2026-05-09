"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Period = "cycle" | "week" | "month";

const LABELS: Record<Period, string> = {
  cycle: "Pay cycle",
  week: "This week",
  month: "This month",
};

export default function PeriodToggle({ current }: { current: Period }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function set(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
      {(["cycle", "week", "month"] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => set(p)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            current === p
              ? "bg-forest text-white"
              : "text-gray-500 hover:text-forest"
          }`}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  );
}
