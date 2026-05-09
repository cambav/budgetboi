"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboard") === "1";

  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [payFrequency, setPayFrequency] = useState("fortnightly");
  const [lastPayDate, setLastPayDate] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [recatDone, setRecatDone] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.akahu_user_token) setHasToken(true);
      if (d.pay_frequency) setPayFrequency(d.pay_frequency);
      if (d.last_pay_date) setLastPayDate(d.last_pay_date);
    });
  }, []);

  async function saveToken() {
    setSyncing(true);
    try {
      const res = await fetch("/api/akahu/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to save token");
        return;
      }
      setTokenSaved(true);
      setHasToken(true);
      // Sync triggers full categorization automatically
      await fetch("/api/akahu/sync", { method: "POST" });
      if (isOnboarding) router.push("/onboarding/setup");
    } finally {
      setSyncing(false);
    }
  }

  async function recategorizeAll() {
    setRecategorizing(true);
    try {
      await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full: true }),
      });
      setRecatDone(true);
      setTimeout(() => setRecatDone(false), 3000);
    } finally {
      setRecategorizing(false);
    }
  }

  async function savePaySettings() {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pay_frequency: payFrequency, last_pay_date: lastPayDate || null }),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-parchment max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        {!isOnboarding && (
          <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="#163422" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <h1 className="text-xl font-bold text-forest">
          {isOnboarding ? "Connect your bank" : "Settings"}
        </h1>
      </div>

      {/* Akahu token */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-4">
        <div>
          <h2 className="font-semibold text-forest mb-0.5">Akahu connection</h2>
          <p className="text-xs text-gray-400">
            Get your personal token from{" "}
            <span className="text-clay underline">myakahu.nz</span> under Apps → budgetboi → Copy token
          </p>
        </div>

        {hasToken && !tokenSaved && (
          <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 rounded-xl">
            <span className="text-emerald-600 text-sm">✓ Bank connected</span>
          </div>
        )}

        {tokenSaved && (
          <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 rounded-xl">
            <span className="text-emerald-600 text-sm">✓ Connected & synced!</span>
          </div>
        )}

        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="user_token_…"
          className="w-full h-12 px-4 rounded-xl bg-parchment text-sm font-mono text-forest outline-none focus:ring-2 focus:ring-forest/20"
        />
        <button
          onClick={saveToken}
          disabled={!token || syncing}
          className="w-full h-12 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {syncing ? "Connecting & syncing…" : hasToken ? "Update token" : "Connect bank"}
        </button>
      </div>

      {/* Pay cycle settings */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-4">
        <div>
          <h2 className="font-semibold text-forest mb-0.5">Pay cycle</h2>
          <p className="text-xs text-gray-400">Used to calculate safe-to-spend and spending resets</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">How often do you get paid?</label>
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">When was your last pay date?</label>
          <input
            type="date"
            value={lastPayDate}
            onChange={(e) => setLastPayDate(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-parchment text-sm text-forest outline-none"
          />
        </div>

        <button
          onClick={savePaySettings}
          className="w-full h-12 bg-forest text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {settingsSaved ? "Saved ✓" : "Save pay settings"}
        </button>
      </div>

      {!isOnboarding && (
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_32px_rgba(22,52,34,0.06)] space-y-3">
          <div>
            <h2 className="font-semibold text-forest mb-0.5">Transaction categories</h2>
            <p className="text-xs text-gray-400">Re-run the rules engine and AI on all transactions (skips manual edits)</p>
          </div>
          <button
            onClick={recategorizeAll}
            disabled={recategorizing}
            className="w-full h-12 bg-forest/10 text-forest rounded-xl text-sm font-medium hover:bg-forest/20 transition-colors disabled:opacity-40"
          >
            {recatDone ? "Done ✓" : recategorizing ? "Re-categorizing…" : "Re-categorize all transactions"}
          </button>
        </div>
      )}

      {!isOnboarding && (
        <button
          onClick={signOut}
          className="w-full h-12 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
        >
          Sign out
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-parchment" />}>
      <SettingsContent />
    </Suspense>
  );
}
