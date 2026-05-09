"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-forest text-center mb-1">
          budgetboi
        </h1>
        <p className="text-sm text-center text-gray-400 mb-8">
          Create your account
        </p>

        <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(22,52,34,0.08)] p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📬</div>
              <p className="font-semibold text-forest text-sm">Check your email</p>
              <p className="text-xs text-gray-400 mt-1">
                We sent a confirmation link to{" "}
                <span className="font-medium text-gray-600">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-forest/20 transition-shadow"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-forest/20 transition-shadow"
              />

              {error && (
                <p className="text-xs text-red-500 px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-14 bg-forest text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-forest font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
