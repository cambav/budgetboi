"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItemProps {
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  variant?: "bottom" | "side";
}

export default function NavItem({ href, icon: Icon, label, variant = "bottom" }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  if (variant === "side") {
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-forest text-white"
            : "text-gray-500 hover:text-forest hover:bg-parchment"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all active:scale-90 ${
        active ? "text-forest" : "text-gray-400 hover:text-forest"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-medium">{label}</span>
    </Link>
  );
}
