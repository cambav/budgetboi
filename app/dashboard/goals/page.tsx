"use client";

import { useEffect, useState } from "react";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "", target_date: "" });
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.goals ?? []);
  }

  useEffect(() => { loadGoals(); }, []);

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || "0"),
        target_date: form.target_date || null,
      }),
    });
    setForm({ name: "", target_amount: "", current_amount: "", target_date: "" });
    setShowForm(false);
    setSaving(false);
    loadGoals();
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-forest">Goals</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-xl bg-forest text-white text-xs font-medium"
        >
          + New goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveGoal} className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-3">
          <input
            required
            placeholder="Goal name (e.g. House deposit)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
          />
          <div className="flex gap-2">
            <input
              required
              type="number"
              placeholder="Target $"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              className="flex-1 h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
            />
            <input
              type="number"
              placeholder="Saved so far $"
              value={form.current_amount}
              onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
              className="flex-1 h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
            />
          </div>
          <input
            type="date"
            placeholder="Target date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            className="w-full h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
        </form>
      )}

      {goals.length === 0 && !showForm && (
        <div className="text-center text-sm text-gray-400 py-12">
          No goals yet. Set one to start tracking your progress.
        </div>
      )}

      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
          const remaining = g.target_amount - g.current_amount;
          return (
            <div key={g.id} className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-forest">{g.name}</p>
                  {g.target_date && (
                    <p className="text-xs text-gray-400">
                      by {new Date(g.target_date).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-clay">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-parchment rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-forest rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>${g.current_amount.toLocaleString("en-NZ")} saved</span>
                <span>${remaining.toLocaleString("en-NZ")} to go</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
