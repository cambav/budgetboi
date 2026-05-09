"use client";

import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Warm earth / terra tones — no blues or hard reds
const PALETTE = [
  "#163422", // forest
  "#7d562d", // clay
  "#9b6b3e", // warm amber
  "#4a7c59", // sage green
  "#c47c5a", // terracotta
  "#6b5e4e", // dusk brown
  "#8fae8f", // soft sage
  "#c9a882", // warm sand
  "#5c7a5c", // muted green
  "#d4b896", // light peach
];

interface SpendingBreakdownProps {
  data: { category: string; amount: number }[];
  totalSpend: number;
  periodLabel?: string;
}

export default function SpendingBreakdown({ data, totalSpend, periodLabel }: SpendingBreakdownProps) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_32px_rgba(22,52,34,0.06)] text-center text-sm text-gray-400">
        No spending data yet — sync your accounts to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-forest capitalize">{periodLabel ?? "This pay cycle"}</h2>
        <span className="text-sm text-gray-400">
          ${totalSpend.toFixed(0)} total
        </span>
      </div>

      <div className="flex gap-4">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={52}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(0)}`, ""]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 8).map((item, i) => (
            <li key={item.category}>
              <Link
                href={`/dashboard/transactions?category=${encodeURIComponent(item.category)}`}
                className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="flex-1 truncate text-gray-700">{item.category}</span>
                <span className="font-medium text-forest shrink-0">
                  ${item.amount.toFixed(0)}
                </span>
                <svg className="w-3 h-3 text-gray-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
