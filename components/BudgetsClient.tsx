"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CATEGORIES } from "@/lib/categories";

type Category = (typeof CATEGORIES)[number];

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
}

interface BudgetsClientProps {
  initialBudgets: Budget[];
  initialSpending: Record<string, number>;
  cycleStart: string;
  avgMonthly: Record<string, number>;
  monthLabels: string[];
  monthlyHistory: Record<string, number[]>;
}

const SPENDABLE_CATEGORIES = CATEGORIES.filter(
  (c) => c !== "Income" && c !== "Transfers to others" && c !== "Misc"
);

const CATEGORY_ICONS: Record<string, string> = {
  "Groceries": "🛒", "Dining & takeaway": "🍜", "Fuel": "⛽", "Alcohol": "🍺",
  "Transport": "🚌", "Shopping": "🛍", "Subscriptions": "📱", "Health & medical": "💊",
  "Utilities": "💡", "Phone & internet": "📶", "Insurance": "🛡", "Rates": "🏠",
  "Car loan": "🚗", "Mortgage & loan": "🏦", "Daycare": "👶", "Golf": "⛳",
  "Travel": "✈️", "Fees & fines": "📋", "Wedding / events": "🎉",
};

function fmt(n: number) {
  return n.toLocaleString("en-NZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ProgressBar({ actual, limit }: { actual: number; limit: number }) {
  const pct = Math.min((actual / limit) * 100, 100);
  const over = actual > limit;
  const warn = pct >= 90;
  const barColor = over ? "bg-red-400" : warn ? "bg-amber-400" : "bg-forest";
  const trackColor = over ? "bg-red-100" : warn ? "bg-amber-100" : "bg-parchment";
  return (
    <div className={`h-2 rounded-full ${trackColor} overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type WizardStep = "category" | "amount" | null;

export default function BudgetsClient({
  initialBudgets,
  initialSpending,
  cycleStart,
  avgMonthly,
  monthLabels,
  monthlyHistory,
}: BudgetsClientProps) {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [spending] = useState<Record<string, number>>(initialSpending);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [wizardStep, setWizardStep] = useState<WizardStep>(null);
  const [wizardCategory, setWizardCategory] = useState<Category | "">("");
  const [wizardAmount, setWizardAmount] = useState("");

  const budgetedCats = new Set(budgets.map((b) => b.category));
  const unbudgetedWithSpend = SPENDABLE_CATEGORIES.filter(
    (c) => !budgetedCats.has(c) && (spending[c] ?? 0) > 0
  ).sort((a, b) => (spending[b] ?? 0) - (spending[a] ?? 0));
  const availableCats = SPENDABLE_CATEGORIES.filter((c) => !budgetedCats.has(c));

  function openWizard(preCategory?: Category) {
    setWizardCategory(preCategory ?? "");
    if (preCategory) {
      setWizardAmount(avgMonthly[preCategory] ? String(Math.round(avgMonthly[preCategory])) : "");
      setWizardStep("amount");
    } else {
      setWizardAmount("");
      setWizardStep("category");
    }
    setEditingId(null);
  }

  function pickWizardCategory(cat: Category) {
    setWizardCategory(cat);
    setWizardAmount(avgMonthly[cat] ? String(Math.round(avgMonthly[cat])) : "");
    setWizardStep("amount");
  }

  async function saveEdit(b: Budget) {
    if (!editValue || isNaN(Number(editValue))) return;
    setSaving(true);
    await fetch(`/api/budgets/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit_amount: Number(editValue) }),
    });
    setBudgets((prev) => prev.map((x) => x.id === b.id ? { ...x, limit_amount: Number(editValue) } : x));
    setEditingId(null);
    setSaving(false);
  }

  async function deleteBudget(id: string) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  async function confirmWizard() {
    if (!wizardCategory || !wizardAmount) return;
    setSaving(true);
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: wizardCategory, limit_amount: Number(wizardAmount) }),
    });
    const { budget } = await res.json();
    setBudgets((prev) => [...prev, budget].sort((a, b) => a.category.localeCompare(b.category)));
    setWizardStep(null);
    setWizardCategory("");
    setWizardAmount("");
    setSaving(false);
  }

  const histForWizard = wizardCategory ? (monthlyHistory[wizardCategory] ?? [0, 0, 0]) : null;
  const maxHistVal = histForWizard ? Math.max(...histForWizard, 1) : 1;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-forest">Budgets</h1>
          <p className="text-xs text-gray-400">
            Cycle from {format(new Date(cycleStart), "d MMM")}
          </p>
        </div>
        {wizardStep === null && (
          <button
            onClick={() => openWizard()}
            className="px-3 py-1.5 rounded-xl bg-forest text-white text-xs font-medium"
          >
            + Set budget
          </button>
        )}
      </div>

      {wizardStep === "category" && (
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-forest text-sm">Which category?</h2>
              <p className="text-xs text-gray-400">Pick a category to set a monthly limit for.</p>
            </div>
            <button onClick={() => setWizardStep(null)} className="text-gray-400 text-xs">Cancel</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {availableCats.map((cat) => {
              const avg = avgMonthly[cat];
              return (
                <button
                  key={cat}
                  onClick={() => pickWizardCategory(cat as Category)}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-parchment hover:bg-forest/5 text-left transition-colors"
                >
                  <span className="text-xl shrink-0">{CATEGORY_ICONS[cat] ?? "•"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-forest leading-tight truncate">{cat}</p>
                    {avg ? <p className="text-[10px] text-gray-400">~${fmt(avg)}/mo</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {wizardStep === "amount" && wizardCategory && (
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWizardStep("category")}
              className="w-7 h-7 rounded-xl bg-parchment flex items-center justify-center shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="#163422" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Budget for</p>
              <h2 className="font-semibold text-forest text-sm flex items-center gap-1.5">
                <span>{CATEGORY_ICONS[wizardCategory] ?? "•"}</span>
                {wizardCategory}
              </h2>
            </div>
            <button onClick={() => setWizardStep(null)} className="text-gray-400 text-xs">Cancel</button>
          </div>

          {histForWizard && histForWizard.some((v) => v > 0) && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Your last 3 months</p>
              <div className="flex items-end gap-2 h-16">
                {histForWizard.map((v, i) => {
                  const h = Math.round((v / maxHistVal) * 56);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      {v > 0 && <span className="text-[10px] text-gray-500 font-medium">${fmt(v)}</span>}
                      <div className="w-full rounded-t-lg bg-forest/30 mt-auto" style={{ height: h || 2 }} />
                      <span className="text-[9px] text-gray-400">{monthLabels[i] ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {avgMonthly[wizardCategory] && (
            <p className="text-xs text-gray-500 bg-parchment rounded-xl px-3 py-2">
              Suggested: <span className="font-semibold text-forest">${fmt(Math.round(avgMonthly[wizardCategory]))}</span>
              {" "}— based on your 3-month average
            </p>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Monthly limit (NZD)</label>
            <input
              autoFocus
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 400"
              value={wizardAmount}
              onChange={(e) => setWizardAmount(e.target.value)}
              className="w-full h-14 px-4 rounded-xl bg-parchment text-lg font-semibold text-forest outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWizardStep(null)}
              className="flex-1 h-12 rounded-xl border border-gray-200 text-sm text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmWizard}
              disabled={saving || !wizardAmount}
              className="flex-1 h-12 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Set budget →"}
            </button>
          </div>
        </div>
      )}

      {budgets.length === 0 && wizardStep === null ? (
        <div className="bg-white rounded-3xl p-8 shadow-[0_4px_32px_rgba(22,52,34,0.06)] text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold text-forest mb-1">No budgets yet</p>
          <p className="text-sm text-gray-400">Tap &ldquo;+ Set budget&rdquo; to set spending limits per category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const actual = spending[b.category] ?? 0;
            const pct = b.limit_amount > 0 ? Math.min((actual / b.limit_amount) * 100, 999) : 0;
            const over = actual > b.limit_amount;
            const warn = pct >= 90 && !over;
            const icon = CATEGORY_ICONS[b.category] ?? "•";

            return (
              <div key={b.id} className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="font-semibold text-forest text-sm">{b.category}</p>
                      {over && <p className="text-xs text-red-500 font-medium">Over by ${fmt(actual - b.limit_amount)}</p>}
                      {warn && <p className="text-xs text-amber-600 font-medium">Almost at limit</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === b.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          autoFocus
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(b);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-20 h-7 px-2 rounded-lg bg-parchment text-sm text-forest outline-none text-right"
                        />
                        <button onClick={() => saveEdit(b)} disabled={saving} className="px-2 py-1 rounded-lg bg-forest text-white text-xs">✓</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">✕</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(b.id); setEditValue(String(b.limit_amount)); }}
                          className="text-gray-300 hover:text-gray-500 text-xs px-1"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => deleteBudget(b.id)}
                          className="text-gray-300 hover:text-red-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <ProgressBar actual={actual} limit={b.limit_amount} />

                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className={over ? "text-red-500 font-semibold" : ""}>${fmt(actual)} spent</span>
                  <span>${fmt(b.limit_amount)} limit · {pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unbudgetedWithSpend.length > 0 && wizardStep === null && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            Spending without a budget
          </h2>
          <div className="bg-white rounded-3xl px-4 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
            {unbudgetedWithSpend.map((cat, i) => (
              <div
                key={cat}
                className={`flex items-center justify-between py-3 ${
                  i < unbudgetedWithSpend.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[cat] ?? "•"}</span>
                  <span className="text-sm text-forest">{cat}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-forest">${fmt(spending[cat] ?? 0)}</span>
                  <button
                    onClick={() => openWizard(cat as Category)}
                    className="text-xs text-clay border border-clay/30 px-2 py-0.5 rounded-full"
                  >
                    + budget
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
