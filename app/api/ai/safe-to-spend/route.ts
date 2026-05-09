import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, SYSTEM_PROMPT } from "@/lib/anthropic";
import { currentCycleStart, nextPayday, daysUntilNextPay } from "@/lib/pay-cycle";
import { format } from "date-fns";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance, type, connection_name, is_loan")
    .eq("user_id", user.id);

  const { data: txns } = await supabase
    .from("transactions")
    .select("date, description, merchant_name, amount, category, is_pending")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(300);

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };

  const cycleStart = currentCycleStart(cycleConfig);
  const daysLeft = daysUntilNextPay(cycleConfig);
  const nextPay = nextPayday(cycleStart, cycleConfig);

  const cycleTxns = (txns ?? []).filter(
    (t) => new Date(t.date) >= cycleStart && t.amount < 0 && !t.is_pending
  );
  const cycleSpend = cycleTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const pendingTxns = (txns ?? []).filter((t) => t.is_pending && t.amount < 0);
  const pendingTotal = pendingTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const checkingAccounts = (accounts ?? []).filter(
    (a) => !a.is_loan && a.balance !== null && a.balance > 0
  );
  const totalBalance = checkingAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const context = `
USER CONTEXT (today: ${format(new Date(), "d MMM yyyy")}):
Total liquid balance: $${totalBalance.toFixed(2)} NZD
Pending transactions: -$${pendingTotal.toFixed(2)} NZD
Available: $${(totalBalance - pendingTotal).toFixed(2)} NZD

Days until next pay (${format(nextPay, "d MMM")}): ${daysLeft} days
Pay frequency: ${cycleConfig.pay_frequency}

Spending this pay cycle (since ${format(cycleStart, "d MMM")}):
${cycleTxns
  .slice(0, 50)
  .map((t) => `- ${t.merchant_name ?? t.description}: $${Math.abs(t.amount).toFixed(2)} (${t.category ?? "misc"})`)
  .join("\n")}
Total spent this cycle: $${cycleSpend.toFixed(2)}

Upcoming pending:
${pendingTxns.map((t) => `- ${t.merchant_name ?? t.description}: $${Math.abs(t.amount).toFixed(2)}`).join("\n") || "None"}
`.trim();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${context}

Based on this, give me:
1. A "safe to spend today" dollar amount — a specific number the user can spend freely without stress
2. One sentence of reasoning (mention key factors like upcoming bills, days to pay, spending pace)
3. A simple status: "comfortable" | "watch it" | "tight"

Respond as JSON only: {"amount": 123.45, "reasoning": "...", "status": "comfortable"}
No markdown fences.`,
      },
    ],
  });

  let result = { amount: 0, reasoning: "Unable to calculate", status: "watch it" };
  try {
    result = JSON.parse((message.content[0] as { text: string }).text.trim());
  } catch {
    //
  }

  return NextResponse.json({
    ...result,
    breakdown: {
      available: Math.round(totalBalance - pendingTotal),
      pending: Math.round(pendingTotal),
      cycle_spend: Math.round(cycleSpend),
      days_left: daysLeft,
    },
  });
}
