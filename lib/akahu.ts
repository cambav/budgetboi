const AKAHU_BASE = "https://api.akahu.io";
const APP_TOKEN = process.env.AKAHU_APP_TOKEN!;

export interface AkahuAccount {
  _id: string;
  name: string;
  formatted_account?: string;
  type: string;
  balance?: number | { currency: string; current: number; available: number; overdrawn: boolean };
  currency?: string;
  connection: { name: string };
}

export function extractBalance(balance: AkahuAccount["balance"]): number | null {
  if (balance == null) return null;
  if (typeof balance === "number") return balance;
  // Prefer available over current — available reflects what can actually be spent
  // (important for NZHL revolving credit accounts where available != current)
  return balance.available ?? balance.current ?? null;
}

export interface AkahuTransaction {
  _id: string;
  _account: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  merchant?: { name?: string; website?: string };
  category?: { groups?: { personal_finance?: { name?: string } } };
}

function headers(userToken: string) {
  return {
    Authorization: `Bearer ${userToken}`,
    "X-Akahu-ID": APP_TOKEN,
    "Content-Type": "application/json",
  };
}

export async function getAccounts(userToken: string): Promise<AkahuAccount[]> {
  const res = await fetch(`${AKAHU_BASE}/v1/accounts`, {
    headers: headers(userToken),
  });
  if (!res.ok) throw new Error(`Akahu accounts error: ${res.status}`);
  const json = await res.json();
  return json.items ?? [];
}

export async function refreshAccounts(userToken: string): Promise<void> {
  try {
    await fetch(`${AKAHU_BASE}/v1/refresh`, {
      method: "POST",
      headers: headers(userToken),
    });
  } catch {
    // Personal tokens may not have refresh permission — safe to ignore
  }
}

export async function getAllTransactions(
  userToken: string,
  startDate: Date
): Promise<AkahuTransaction[]> {
  const all: AkahuTransaction[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${AKAHU_BASE}/v1/transactions`);
    url.searchParams.set("start", startDate.toISOString());
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), { headers: headers(userToken) });
    if (!res.ok) throw new Error(`Akahu transactions error: ${res.status}`);

    const json = await res.json();
    all.push(...(json.items ?? []));
    cursor = json.cursor?.next ?? undefined;
  } while (cursor);

  // Also fetch pending transactions
  try {
    const pendingRes = await fetch(`${AKAHU_BASE}/v1/transactions/pending`, {
      headers: headers(userToken),
    });
    if (pendingRes.ok) {
      const pendingJson = await pendingRes.json();
      const pending = (pendingJson.items ?? []).map((t: AkahuTransaction) => ({
        ...t,
        _id: `pending_${t._id}`,
        isPending: true,
      }));
      all.push(...pending);
    }
  } catch {
    // Pending may not be available for all tokens
  }

  return all;
}
