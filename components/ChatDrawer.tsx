"use client";

import { useState, useRef, useEffect } from "react";
import ChatInterface from "./ChatInterface";

export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setOpen(false);
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* FAB — hidden on desktop (chat accessible from sidebar link) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask AI"
        className="fixed bottom-[72px] right-4 z-40 w-14 h-14 rounded-full bg-forest text-white shadow-[0_4px_20px_rgba(22,52,34,0.35)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.3-1.4A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z" fill="currentColor" opacity=".15"/>
          <path d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.3-1.4A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 10.5h.01M11 10.5h.01M14 10.5h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Backdrop + drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={handleBackdrop}
        >
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          {/* Drawer */}
          <div
            ref={drawerRef}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(22,52,34,0.15)] flex flex-col animate-slide-up"
            style={{ height: "82vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-forest/10 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.3-1.4A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z" fill="#163422"/>
                  </svg>
                </div>
                <span className="font-semibold text-forest text-sm">Ask budgetboi</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Chat content */}
            <div className="flex-1 min-h-0">
              <ChatInterface />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
