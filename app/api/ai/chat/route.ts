import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, SYSTEM_PROMPT } from "@/lib/anthropic";
import { currentCycleStart } from "@/lib/pay-cycle";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get recent 90 days of transactions for context
  const { data: txns } = await supabase
    .from("transactions")
    .select("date, description, merchant_name, amount, category, is_pending")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(500);

  // Get accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance, type, connection_name, is_loan")
    .eq("user_id", user.id);

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };
  const cycleStart = currentCycleStart(cycleConfig);

  const cycleTxns = (txns ?? []).filter(
    (t) => new Date(t.date) >= cycleStart && t.amount < 0
  );
  const cycleSpend = cycleTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const contextBlock = `
USER FINANCIAL CONTEXT (today: ${format(new Date(), "d MMM yyyy")}):

Accounts:
${(accounts ?? []).map((a) => `- ${a.connection_name} ${a.name}: $${a.balance?.toFixed(2) ?? "N/A"} NZD${a.is_loan ? " (loan)" : ""}`).join("\n")}

This pay cycle (since ${format(cycleStart, "d MMM")}): spent $${cycleSpend.toFixed(2)} NZD
Pay frequency: ${cycleConfig.pay_frequency}

Recent transactions (last 500):
${(txns ?? [])
  .slice(0, 500)
  .map(
    (t) =>
      `${format(new Date(t.date), "d MMM")} | ${t.merchant_name ?? t.description} | $${Math.abs(t.amount).toFixed(2)} ${t.amount < 0 ? "spent" : "received"} | ${t.category ?? "uncategorized"}${t.is_pending ? " (pending)" : ""}`
  )
  .join("\n")}
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
    messages: messages,
  });

  return NextResponse.json({
    reply: (response.content[0] as { text: string }).text,
  });
}
