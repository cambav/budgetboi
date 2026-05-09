"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-forest text-center mb-1">
          budgetboi
        </h1>
        <p className="text-sm text-center text-gray-400 mb-8">
          Sign in to your account
        </p>

        <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(22,52,34,0.08)] p-8">
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-forest font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
