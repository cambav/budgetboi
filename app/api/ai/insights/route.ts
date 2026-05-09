import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, SYSTEM_PROMPT } from "@/lib/anthropic";
import { currentCycleStart } from "@/lib/pay-cycle";
import { format, subDays } from "date-fns";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return cached if fresh
  const { data: cached } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(5);

  if (cached && cached.length >= 2) {
    return NextResponse.json({ insights: cached });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: txns } = await supabase
    .from("transactions")
    .select("date, description, merchant_name, amount, category")
    .eq("user_id", user.id)
    .gte("date", subDays(new Date(), 90).toISOString())
    .order("date", { ascending: false })
    .limit(400);

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };
  const cycleStart = currentCycleStart(cycleConfig);

  // Spending by category this cycle
  const cycleTxns = (txns ?? []).filter(
    (t) => new Date(t.date) >= cycleStart && t.amount < 0
  );
  const byCategory: Record<string, number> = {};
  for (const t of cycleTxns) {
    const cat = t.category ?? "Misc";
    byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
  }

  const context = `
Today: ${format(new Date(), "d MMM yyyy")}
Pay cycle started: ${format(cycleStart, "d MMM")}

Category breakdown this cycle:
${Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
  .join("\n")}

All transactions last 90 days (most recent first):
${(txns ?? [])
  .map(
    (t) =>
      `${format(new Date(t.date), "d MMM")} | ${t.merchant_name ?? t.description} | $${Math.abs(t.amount).toFixed(2)} ${t.amount < 0 ? "spent" : "received"} | ${t.category ?? "misc"}`
  )
  .join("\n")}
`.trim();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${context}

Generate 3 proactive financial insights for this user. Each insight should be genuinely useful, specific, and based on their actual data.

Ideas to consider (pick the most relevant):
- Subscription audit: list recurring charges and total per month
- Unusual spending: categories or merchants spending more than normal
- Spending velocity: are they on track or running hot this cycle?
- Pattern observations: e.g. "You spend 3x more on weekends"
- Quick wins: one specific thing they could cut or optimize

Respond as JSON array only:
[{"type":"subscription_audit","title":"Short title","content":"2-3 sentence insight with specific numbers"},...]

3 items. No markdown fences. Make them punchy and specific to their actual transactions.`,
      },
    ],
  });

  let insights: { type: string; title: string; content: string }[] = [];
  try {
    insights = JSON.parse((message.content[0] as { text: string }).text.trim());
  } catch {
    return NextResponse.json({ insights: [] });
  }

  // Cache insights in DB
  const rows = insights.map((ins) => ({
    user_id: user.id,
    insight_type: ins.type,
    title: ins.title,
    content: ins.content,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));
  await supabase.from("ai_insights").insert(rows);

  return NextResponse.json({ insights: rows });
}
