"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/transactions", label: "Txns", label2: "Transactions", icon: ListIcon },
  { href: "/dashboard/budgets", label: "Budgets", icon: BudgetIcon },
  { href: "/dashboard/trends", label: "Trends", icon: TrendIcon },
  { href: "/dashboard/cashflow", label: "Cash Flow", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const SIDEBAR_ONLY = [
  { href: "/dashboard/chat", label: "Ask AI", icon: ChatIcon },
];

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-sm border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50 lg:hidden safe-area-inset-bottom">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all active:scale-90 ${
              active ? "text-forest" : "text-gray-400"
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform duration-150 ${active ? "scale-110" : ""}`} />
            <span className={`text-[9px] font-medium transition-all ${active ? "font-bold" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.slice(0, 5).map(({ href, label2, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-forest text-white shadow-[0_2px_8px_rgba(22,52,34,0.25)]"
                  : "text-gray-500 hover:text-forest hover:bg-parchment"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label2 ?? label}
            </Link>
          );
        })}
        {/* Divider */}
        <div className="my-2 border-t border-gray-100" />
        {SIDEBAR_ONLY.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-forest text-white shadow-[0_2px_8px_rgba(22,52,34,0.25)]"
                  : "text-gray-500 hover:text-forest hover:bg-parchment"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isActive("/settings", pathname)
              ? "bg-forest text-white"
              : "text-gray-500 hover:text-forest hover:bg-parchment"
          }`}
        >
          <SettingsIcon className="w-4 h-4 shrink-0" />
          Settings
        </Link>
      </div>
    </>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  );
}
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}
function BudgetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}
function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}
