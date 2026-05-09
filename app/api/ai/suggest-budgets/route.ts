import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, SYSTEM_PROMPT } from "@/lib/anthropic";
import { CATEGORIES } from "@/lib/categories";
import { subDays, differenceInDays } from "date-fns";

export interface UserProfile {
  income_per_cycle: number;
  household: "solo" | "couple" | "family";
  num_kids: number;
  housing_cost_per_cycle: number;
  goal: "house_deposit" | "pay_debt" | "build_savings" | "just_track";
  goal_amount?: number;
  goal_months?: number;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile }: { profile: UserProfile } = await req.json();

  // Fetch settings for pay cycle
  const { data: settings } = await supabase
    .from("user_settings")
    .select("pay_frequency, pay_day_of_week, pay_day_of_month, last_pay_date")
    .eq("user_id", user.id)
    .single();

  const cycleConfig = {
    pay_frequency: (settings?.pay_frequency ?? "fortnightly") as "weekly" | "fortnightly" | "monthly",
    pay_day_of_week: settings?.pay_day_of_week ?? 5,
    pay_day_of_month: settings?.pay_day_of_month ?? 15,
    last_pay_date: settings?.last_pay_date ?? null,
  };

  // Fetch last 90 days of transactions
  const since = subDays(new Date(), 90);
  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, category, date")
    .eq("user_id", user.id)
    .gte("date", since.toISOString())
    .order("date", { ascending: false });

  // Work out number of pay cycles in the last 90 days for averaging
  const daysOfData = differenceInDays(new Date(), since);
  const cycleLengthDays =
    cycleConfig.pay_frequency === "weekly" ? 7
    : cycleConfig.pay_frequency === "fortnightly" ? 14
    : 30;
  const numCycles = Math.max(1, daysOfData / cycleLengthDays);

  // Aggregate actual spend per category (debits only, exclude income/transfers)
  const excluded = new Set(["Income", "Transfers to others", "Mortgage & loan", "Car loan", "Rates"]);
  const totalByCategory: Record<string, number> = {};
  let detectedIncome = 0;

  for (const t of txns ?? []) {
    if (t.amount > 0) {
      detectedIncome += t.amount;
      continue;
    }
    const cat = t.category ?? "Misc";
    if (excluded.has(cat)) continue;
    totalByCategory[cat] = (totalByCategory[cat] ?? 0) + Math.abs(t.amount);
  }

  // Average per cycle
  const avgPerCycle: Record<string, number> = {};
  for (const [cat, total] of Object.entries(totalByCategory)) {
    avgPerCycle[cat] = Math.round(total / numCycles);
  }
  const avgIncome = Math.round(detectedIncome / numCycles);

  const spendLines = Object.entries(avgPerCycle)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  ${cat}: $${amt} actual avg/cycle`)
    .join("\n");

  const goalLabels: Record<string, string> = {
    house_deposit: "save for a house deposit",
    pay_debt: "pay off debt",
    build_savings: "build an emergency fund / savings buffer",
    just_track: "get visibility and control over spending",
  };

  const householdDesc =
    profile.household === "family"
      ? `family with ${profile.num_kids} kid${profile.num_kids !== 1 ? "s" : ""}`
      : profile.household === "couple"
      ? "couple (no kids)"
      : "living solo";

  const savingsNeeded =
    profile.goal !== "just_track" && profile.goal_amount && profile.goal_months
      ? `They want to save $${profile.goal_amount.toLocaleString()} in ${profile.goal_months} months — that's $${Math.round(profile.goal_amount / profile.goal_months * (cycleLengthDays / 30) )} per pay cycle.`
      : "";

  const prompt = `You are setting up a personal budget for a New Zealander.

THEIR SITUATION:
- Household: ${householdDesc}
- Take-home income: $${profile.income_per_cycle}/cycle (${cycleConfig.pay_frequency})
- Rent/mortgage: $${profile.housing_cost_per_cycle}/cycle (already excluded from discretionary)
- Main goal: ${goalLabels[profile.goal]}
${savingsNeeded}

DETECTED INCOME from bank (avg/cycle): $${avgIncome}
${Math.abs(avgIncome - profile.income_per_cycle) > 200 ? `(Note: stated income differs from detected — stated figure is likely more accurate)` : ""}

ACTUAL SPENDING last 90 days (averaged per ${cycleConfig.pay_frequency} cycle):
${spendLines || "  No categorised spending yet"}

AVAILABLE CATEGORIES TO BUDGET:
${CATEGORIES.filter(c => !excluded.has(c) && c !== "Income").join(", ")}

YOUR TASK:
Suggest a realistic budget limit for each relevant category. Base it on:
1. Their actual spending as a starting point
2. Adjust to fit their income minus rent minus savings goal
3. NZ cost of living for their household size (e.g. family groceries avg $400–600/fortnight in NZ)
4. Only include categories where they actually spend OR where they obviously should budget

Rules:
- The sum of all budget limits should leave room for their savings goal and rent
- If a category spend is reasonable, keep it close to actual — don't slash arbitrarily
- If a category is clearly high for their situation, suggest a more realistic number and say why
- Skip categories they clearly don't use (0 actual and no obvious need)
- Include a brief reasoning for each suggestion (1 short sentence)

Respond ONLY as JSON array, no markdown:
[{"category":"Groceries","amount":320,"reasoning":"Reasonable for a couple, slight trim from your $380 actual"},...]`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  let suggestions: { category: string; amount: number; reasoning: string }[] = [];
  try {
    const raw = (message.content[0] as { text: string }).text.trim();
    suggestions = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Parse error" }, { status: 500 });
  }

  // Save profile to user_settings
  await supabase
    .from("user_settings")
    .update({ profile, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ suggestions, avgPerCycle, numCycles: Math.round(numCycles) });
}
