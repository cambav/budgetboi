"use client";

interface Account {
  id: string;
  name: string;
  connection_name: string | null;
  balance: number | null;
  type: string | null;
  is_loan: boolean;
}

// Warm earth tones — one per bank, no brand colours
const BANK_COLORS: Record<string, string> = {
  BNZ:      "#7d562d", // clay
  ANZ:      "#5c7a5c", // muted sage
  ASB:      "#9b6b3e", // warm amber
  Westpac:  "#6b7c6b", // dusty green
  Kiwibank: "#4a7c59", // forest light
  TSB:      "#7a6b55", // dusk
  NZHL:     "#8b6e4e", // warm brown
};

export default function AccountsList({ accounts }: { accounts: Account[] }) {
  // Sort by balance descending; negative-balance accounts go to the bottom
  const sorted = [...accounts].sort((a, b) => {
    const aBal = a.balance ?? 0;
    const bBal = b.balance ?? 0;
    if (aBal < 0 && bBal >= 0) return 1;
    if (bBal < 0 && aBal >= 0) return -1;
    return bBal - aBal;
  });

  const total = accounts
    .filter((a) => !a.is_loan && (a.balance ?? 0) > 0)
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const loans = accounts.filter((a) => a.is_loan);
  const totalDebt = loans.reduce((sum, a) => sum + Math.abs(a.balance ?? 0), 0);

  return (
    <div className="space-y-2">
      {sorted.map((a) => {
        const bankColor = BANK_COLORS[a.connection_name ?? ""] ?? "#163422";
        const isNZHL = a.connection_name === "NZHL";
        return (
          <div
            key={a.id}
            className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_2px_12px_rgba(22,52,34,0.06)]"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: bankColor }}
            >
              {(a.connection_name ?? "?").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forest truncate">{a.name}</p>
              <p className="text-xs text-gray-400">
                {a.connection_name} · {a.type}
                {isNZHL && <span className="ml-1 text-gray-300">· available balance</span>}
              </p>
            </div>
            <span className={`text-sm font-semibold shrink-0 ${(a.balance ?? 0) < 0 ? "text-red-500" : "text-forest"}`}>
              {(a.balance ?? 0) < 0 ? "−" : ""}${Math.abs(a.balance ?? 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}
            </span>
          </div>
        );
      })}

      <div className="flex justify-between px-1 pt-1">
        <span className="text-xs text-gray-400">
          Net liquid: <span className="text-forest font-medium">${total.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}</span>
        </span>
        {totalDebt > 0 && (
          <span className="text-xs text-gray-400">
            Debt: <span className="text-red-400 font-medium">${totalDebt.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}</span>
          </span>
        )}
      </div>
    </div>
  );
}
