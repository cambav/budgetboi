"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CATEGORIES } from "@/lib/categories";

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  category_source: string | null;
  is_pending: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Groceries": "🛒", "Dining & takeaway": "🍜", "Fuel": "⛽", "Alcohol": "🍺",
  "Transport": "🚌", "Shopping": "🛍", "Subscriptions": "📱", "Health & medical": "💊",
  "Utilities": "💡", "Phone & internet": "📶", "Insurance": "🛡", "Rates": "🏠",
  "Car loan": "🚗", "Mortgage & loan": "🏦", "Daycare": "👶", "Golf": "⛳",
  "Travel": "✈️", "Fees & fines": "📋", "Transfers to others": "↗️",
  "Wedding / events": "🎉", "Income": "💚", "Misc": "•",
};

const SOURCE_LABEL: Record<string, string> = {
  akahu: "Akahu", rules: "rules", ai: "AI", manual: "you", pending: "pending",
};

export default function TransactionsPageClient({
  initialTransactions,
  initialCategory = "all",
  dateLabel,
}: {
  initialTransactions: Transaction[];
  initialCategory?: string;
  dateLabel?: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(initialCategory);
  const [search, setSearch] = useState("");

  async function updateCategory(id: string, category: string) {
    setTransactions((prev) =>
      prev.map((t) => t.id === id ? { ...t, category, category_source: "manual" } : t)
    );
    setEditing(null);
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
  }

  const categories = ["all", ...Array.from(new Set(transactions.map((t) => t.category ?? "Misc"))).sort()];

  const visible = transactions.filter((t) => {
    const effectiveCategory = t.category ?? "Misc";
    if (filter !== "all" && effectiveCategory !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (t.merchant_name ?? t.description).toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold text-forest">Transactions</h1>
        {dateLabel && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{dateLabel}</span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full h-11 pl-9 pr-4 rounded-xl bg-white shadow-sm text-sm text-forest outline-none focus:ring-2 focus:ring-forest/20"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === c
                ? "bg-forest text-white"
                : "bg-white text-gray-500 shadow-sm"
            }`}
          >
            {c === "all" ? "All" : `${CATEGORY_ICONS[c] ?? "•"} ${c}`}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-3xl px-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
        {visible.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No transactions match.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {visible.map((t) => {
              const icon = CATEGORY_ICONS[t.category ?? ""] ?? "•";
              const isIncome = t.amount > 0;
              const label = t.merchant_name ?? t.description;

              return (
                <li key={t.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditing(editing === t.id ? null : t.id)}
                      className="w-9 h-9 rounded-xl bg-parchment flex items-center justify-center text-sm shrink-0 hover:bg-gray-100 transition-colors"
                      title="Change category"
                    >
                      {icon}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest truncate">{label}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">{format(new Date(t.date), "d MMM")}</span>
                        {t.category && (
                          <span className="text-xs text-gray-300">· {t.category}</span>
                        )}
                        {t.category_source && t.category_source !== "pending" && (
                          <span className="text-[10px] px-1 py-0.5 rounded-full bg-gray-50 text-gray-300">
                            {SOURCE_LABEL[t.category_source] ?? t.category_source}
                          </span>
                        )}
                        {t.is_pending && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                            pending
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${isIncome ? "text-emerald-600" : "text-forest"}`}>
                      {isIncome ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>

                  {/* Category picker */}
                  {editing === t.id && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateCategory(t.id, c)}
                          className={`px-2 py-1.5 rounded-xl text-xs font-medium text-left transition-colors ${
                            t.category === c
                              ? "bg-forest text-white"
                              : "bg-parchment text-forest hover:bg-gray-100"
                          }`}
                        >
                          {CATEGORY_ICONS[c] ?? "•"} {c}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
