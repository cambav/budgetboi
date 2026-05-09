"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function sync() {
    setSyncing(true);
    try {
      await fetch("/api/akahu/sync", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest/10 text-forest text-xs font-medium hover:bg-forest/20 transition-colors disabled:opacity-50"
    >
      <svg
        className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M13.5 8A5.5 5.5 0 112.5 5M13.5 2v3h-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {syncing ? "Syncing…" : "Sync"}
    </button>
  );
}
