"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/app/api/ai/suggest-budgets/route";

type Step = "income" | "household" | "housing" | "goal" | "goal_detail" | "thinking" | "review";

interface Suggestion {
  category: string;
  amount: number;
  reasoning: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("income");
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    household: "solo",
    num_kids: 0,
    goal: "just_track",
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [edited, setEdited] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchSuggestions() {
    setStep("thinking");
    setError("");
    try {
      const res = await fetch("/api/ai/suggest-budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuggestions(data.suggestions ?? []);
      const initial: Record<string, number> = {};
      for (const s of data.suggestions ?? []) initial[s.category] = s.amount;
      setEdited(initial);
      setStep("review");
    } catch (e) {
      setError(String(e));
      setStep("goal_detail");
    }
  }

  async function saveBudgets() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(edited).map(([category, limit_amount]) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, limit_amount }),
          })
        )
      );
      // Mark setup complete
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup_complete: true }),
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center justify-start pt-12 px-4">
      <div className="w-full max-w-sm">

        {/* Progress dots */}
        {step !== "thinking" && step !== "review" && (
          <div className="flex gap-1.5 justify-center mb-8">
            {(["income", "household", "housing", "goal", "goal_detail"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-6 bg-forest" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── INCOME ─────────────────────────────────────── */}
        {step === "income" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">Let&apos;s set up your budget</h1>
              <p className="text-sm text-gray-400">A few quick questions so we can suggest sensible numbers based on your actual spending.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-forest block mb-2">
                How much do you take home per pay cycle? <span className="text-gray-400 font-normal">(after tax)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  placeholder="e.g. 2800"
                  value={profile.income_per_cycle ?? ""}
                  onChange={(e) => setProfile({ ...profile, income_per_cycle: Number(e.target.value) })}
                  className="w-full h-14 pl-8 pr-4 rounded-2xl bg-white shadow-[0_2px_12px_rgba(22,52,34,0.08)] text-forest text-lg font-medium outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">This stays private — only used to suggest realistic budgets.</p>
            </div>
            <button
              disabled={!profile.income_per_cycle || profile.income_per_cycle < 1}
              onClick={() => setStep("household")}
              className="w-full h-14 bg-forest text-white rounded-2xl font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* ── HOUSEHOLD ──────────────────────────────────── */}
        {step === "household" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">Who are you budgeting for?</h1>
              <p className="text-sm text-gray-400">Helps us benchmark your spending against realistic NZ costs.</p>
            </div>
            <div className="space-y-2">
              {([
                { value: "solo", label: "Just me", sub: "Living solo or managing finances independently" },
                { value: "couple", label: "Me + partner", sub: "Shared household, no kids" },
                { value: "family", label: "Family", sub: "Partner and/or kids" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProfile({ ...profile, household: opt.value, num_kids: opt.value === "family" ? (profile.num_kids || 1) : 0 })}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all ${
                    profile.household === opt.value
                      ? "border-forest bg-forest/5"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <p className="font-medium text-forest">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>

            {profile.household === "family" && (
              <div>
                <label className="text-sm font-medium text-forest block mb-2">How many kids?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setProfile({ ...profile, num_kids: n })}
                      className={`flex-1 h-12 rounded-xl font-medium text-sm transition-all ${
                        profile.num_kids === n ? "bg-forest text-white" : "bg-white text-forest border border-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setProfile({ ...profile, num_kids: 5 })}
                    className={`flex-1 h-12 rounded-xl font-medium text-sm transition-all ${
                      (profile.num_kids ?? 0) >= 5 ? "bg-forest text-white" : "bg-white text-forest border border-gray-200"
                    }`}
                  >
                    5+
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep("income")} className="h-14 px-6 rounded-2xl border border-gray-200 text-forest font-medium">Back</button>
              <button
                onClick={() => setStep("housing")}
                className="flex-1 h-14 bg-forest text-white rounded-2xl font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── HOUSING ────────────────────────────────────── */}
        {step === "housing" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">Rent or mortgage?</h1>
              <p className="text-sm text-gray-400">We&apos;ll set this aside first — it&apos;s non-negotiable, so it shouldn&apos;t count against your discretionary budget.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-forest block mb-2">
                How much per pay cycle?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  placeholder="e.g. 900"
                  value={profile.housing_cost_per_cycle ?? ""}
                  onChange={(e) => setProfile({ ...profile, housing_cost_per_cycle: Number(e.target.value) })}
                  className="w-full h-14 pl-8 pr-4 rounded-2xl bg-white shadow-[0_2px_12px_rgba(22,52,34,0.08)] text-forest text-lg font-medium outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
            </div>
            <button
              onClick={() => setProfile({ ...profile, housing_cost_per_cycle: 0 })}
              className="text-sm text-gray-400 underline w-full text-center"
            >
              I own my home outright / no housing cost
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep("household")} className="h-14 px-6 rounded-2xl border border-gray-200 text-forest font-medium">Back</button>
              <button
                disabled={profile.housing_cost_per_cycle === undefined}
                onClick={() => setStep("goal")}
                className="flex-1 h-14 bg-forest text-white rounded-2xl font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── GOAL ───────────────────────────────────────── */}
        {step === "goal" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">What&apos;s your main money goal?</h1>
              <p className="text-sm text-gray-400">We&apos;ll shape your budget around this.</p>
            </div>
            <div className="space-y-2">
              {([
                { value: "house_deposit", label: "Save for a house deposit", icon: "🏠" },
                { value: "pay_debt", label: "Pay off debt", icon: "📉" },
                { value: "build_savings", label: "Build an emergency fund", icon: "🛡" },
                { value: "just_track", label: "Just track my spending", icon: "📊" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProfile({ ...profile, goal: opt.value })}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                    profile.goal === opt.value
                      ? "border-forest bg-forest/5"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-medium text-forest">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("housing")} className="h-14 px-6 rounded-2xl border border-gray-200 text-forest font-medium">Back</button>
              <button
                onClick={() => profile.goal === "just_track" ? fetchSuggestions() : setStep("goal_detail")}
                className="flex-1 h-14 bg-forest text-white rounded-2xl font-medium"
              >
                {profile.goal === "just_track" ? "Analyse my spending" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* ── GOAL DETAIL ────────────────────────────────── */}
        {step === "goal_detail" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">
                {profile.goal === "house_deposit" ? "House deposit target" :
                 profile.goal === "pay_debt" ? "How much debt?" :
                 "Savings target"}
              </h1>
              <p className="text-sm text-gray-400">Optional — helps us work out how much to set aside each cycle.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-forest block mb-2">Target amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    placeholder={profile.goal === "house_deposit" ? "e.g. 120000" : "e.g. 8000"}
                    value={profile.goal_amount ?? ""}
                    onChange={(e) => setProfile({ ...profile, goal_amount: Number(e.target.value) })}
                    className="w-full h-14 pl-8 pr-4 rounded-2xl bg-white shadow-[0_2px_12px_rgba(22,52,34,0.08)] text-forest text-lg font-medium outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-forest block mb-2">Timeframe (months)</label>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  value={profile.goal_months ?? ""}
                  onChange={(e) => setProfile({ ...profile, goal_months: Number(e.target.value) })}
                  className="w-full h-14 px-4 rounded-2xl bg-white shadow-[0_2px_12px_rgba(22,52,34,0.08)] text-forest text-lg font-medium outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep("goal")} className="h-14 px-6 rounded-2xl border border-gray-200 text-forest font-medium">Back</button>
              <button
                onClick={fetchSuggestions}
                className="flex-1 h-14 bg-forest text-white rounded-2xl font-medium"
              >
                Analyse my spending
              </button>
            </div>
            <button
              onClick={fetchSuggestions}
              className="w-full text-sm text-gray-400 underline text-center"
            >
              Skip — just suggest budgets
            </button>
          </div>
        )}

        {/* ── THINKING ───────────────────────────────────── */}
        {step === "thinking" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-16 h-16 rounded-3xl bg-forest flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-forest text-lg">Analysing your spending…</p>
              <p className="text-sm text-gray-400 mt-1">Comparing your patterns against NZ benchmarks</p>
            </div>
          </div>
        )}

        {/* ── REVIEW ─────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4 pb-8">
            <div>
              <h1 className="text-2xl font-bold text-forest mb-1">Your suggested budgets</h1>
              <p className="text-sm text-gray-400">Based on your actual spending + your situation. Tap any amount to adjust.</p>
            </div>

            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.category}
                  className="bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_12px_rgba(22,52,34,0.06)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-forest text-sm">{s.category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={edited[s.category] ?? s.amount}
                        onChange={(e) => setEdited({ ...edited, [s.category]: Number(e.target.value) })}
                        className="w-20 text-right font-semibold text-forest bg-parchment rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.reasoning}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center px-4">
              You can always change these later in the Budgets tab.
            </p>

            <button
              onClick={saveBudgets}
              disabled={saving}
              className="w-full h-14 bg-forest text-white rounded-2xl font-medium disabled:opacity-50 sticky bottom-4"
            >
              {saving ? "Saving…" : "Save budgets & go to dashboard"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-sm text-gray-400 underline text-center"
            >
              Skip for now
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
