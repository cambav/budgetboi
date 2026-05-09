"use client";

import { useEffect, useState } from "react";

interface TrajectoryData {
  currentSpend: number;
  projectedTotal: number;
  historicalAvg: number | null;
  daysElapsed: number;
  cycleLengthDays: number;
  dailyRate: number;
  trajectory: "over" | "on_track";
  categories: { name: string; amount: number }[];
}

export default function SpendTrajectory() {
  const [data, setData] = useState<TrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/trajectory")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TrajectoryShimmer />;
  if (!data) return null;

  const pct = Math.min((data.currentSpend / ((data.historicalAvg ?? data.projectedTotal) || 1)) * 100, 100);
  const isOver = data.trajectory === "over";
  const barColor = isOver ? "bg-terracotta" : "bg-sage";
  const projectedPct = Math.min((data.projectedTotal / ((data.historicalAvg ?? data.projectedTotal) || 1)) * 100, 120);

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-forest text-sm">Spend Trajectory</h3>
          <p className="text-xs text-gray-400 mt-0.5">Day {data.daysElapsed} of {data.cycleLengthDays}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOver ? "bg-red-50 text-red-500" : "bg-sage/30 text-forest"}`}>
          {isOver ? "Pacing over" : "On track"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Spent so far</span>
          {data.historicalAvg && <span>Avg ${data.historicalAvg.toLocaleString()}/cycle</span>}
        </div>
        <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
          {/* Projected marker */}
          {projectedPct > pct && (
            <div
              className="absolute top-0 h-full w-0.5 bg-gray-300"
              style={{ left: `${Math.min(projectedPct, 100)}%` }}
            />
          )}
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-parchment rounded-2xl p-3">
          <p className="text-xs text-gray-400">Current</p>
          <p className="text-lg font-bold text-forest">${data.currentSpend.toLocaleString()}</p>
        </div>
        <div className="bg-parchment rounded-2xl p-3">
          <p className="text-xs text-gray-400">Projected</p>
          <p className={`text-lg font-bold ${isOver ? "text-terracotta" : "text-forest"}`}>
            ${data.projectedTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top categories */}
      {data.categories.length > 0 && (
        <div className="space-y-2">
          {data.categories.slice(0, 4).map((cat) => (
            <div key={cat.name} className="flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate flex-1">{cat.name}</span>
              <span className="text-xs font-medium text-forest ml-2">${cat.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrajectoryShimmer() {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-2.5 bg-gray-100 rounded-full mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-gray-100 rounded-2xl" />
        <div className="h-16 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}
