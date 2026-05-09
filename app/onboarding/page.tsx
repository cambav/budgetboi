"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAY_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function OnboardingPage() {
  const [frequency, setFrequency] = useState("fortnightly");
  const [payDay, setPayDay] = useState(5); // Friday (1=Mon…5=Fri)
  const [dayOfMonth, setDayOfMonth] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pay_frequency: frequency,
        pay_day_of_week: payDay,
        pay_day_of_month: dayOfMonth,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong — try again.");
      setLoading(false);
      return;
    }

    router.push("/settings?onboard=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-forest text-center mb-1">budgetboi</h1>
        <p className="text-sm text-center text-gray-400 mb-8">When do you get paid?</p>

        <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(22,52,34,0.08)] p-8 flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Frequency</p>
            <div className="flex gap-2">
              {PAY_FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors ${
                    frequency === f.value
                      ? "bg-forest text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {frequency !== "monthly" ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Pay day</p>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => setPayDay(i + 1)}
                    className={`flex-1 h-12 rounded-xl text-xs font-medium transition-colors ${
                      payDay === i + 1
                        ? "bg-forest text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Day of month</p>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="h-14 w-full px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-forest/20 transition-shadow"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500 px-1">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="h-14 bg-forest text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </main>
  );
}
