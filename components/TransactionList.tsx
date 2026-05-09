"use client";

import { format } from "date-fns";

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  is_pending: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Groceries": "🛒",
  "Dining & takeaway": "🍜",
  "Fuel": "⛽",
  "Alcohol": "🍺",
  "Transport": "🚌",
  "Shopping": "🛍",
  "Subscriptions": "📱",
  "Health & medical": "💊",
  "Utilities": "💡",
  "Phone & internet": "📶",
  "Insurance": "🛡",
  "Rates": "🏠",
  "Car loan": "🚗",
  "Mortgage & loan": "🏦",
  "Daycare": "👶",
  "Golf": "⛳",
  "Travel": "✈️",
  "Fees & fines": "📋",
  "Transfers to others": "↗️",
  "Wedding / events": "🎉",
  "Income": "💚",
  "Misc": "•",
};

interface TransactionListProps {
  transactions: Transaction[];
  showCategory?: boolean;
}

export default function TransactionList({ transactions, showCategory = true }: TransactionListProps) {
  if (!transactions.length) {
    return (
      <div className="text-center text-sm text-gray-400 py-8">
        No transactions yet.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-50">
      {transactions.map((t) => {
        const icon = CATEGORY_ICONS[t.category ?? ""] ?? "•";
        const isIncome = t.amount > 0;
        const label = t.merchant_name ?? t.description;

        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-parchment flex items-center justify-center text-sm shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forest truncate">{label}</p>
              <p className="text-xs text-gray-400">
                {format(new Date(t.date), "d MMM")}
                {showCategory && t.category && (
                  <span className="ml-1 text-gray-300">· {t.category}</span>
                )}
                {t.is_pending && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs">
                    pending
                  </span>
                )}
              </p>
            </div>
            <span
              className={`text-sm font-semibold shrink-0 ${
                isIncome ? "text-emerald-600" : "text-forest"
              }`}
            >
              {isIncome ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
