import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentCycleStart } from "@/lib/pay-cycle";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const cycleStart = currentCycleStart(cycleConfig);

  const [{ data: budgets }, { data: cycleTxns }] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, category, limit_amount")
      .eq("user_id", user.id)
      .order("category"),
    supabase
      .from("transactions")
      .select("amount, category")
      .eq("user_id", user.id)
      .gte("date", cycleStart.toISOString())
      .lt("amount", 0),
  ]);

  // Compute spending by category for this cycle (debits only)
  const spending: Record<string, number> = {};
  for (const t of cycleTxns ?? []) {
    if (!t.category || t.category === "Income" || t.category === "Transfers to others") continue;
    spending[t.category] = (spending[t.category] ?? 0) + Math.abs(t.amount);
  }

  return NextResponse.json({
    budgets: budgets ?? [],
    spending,
    cycleStart: cycleStart.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { category, limit_amount } = body;
  if (!category || !limit_amount) {
    return NextResponse.json({ error: "category and limit_amount required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category, limit_amount: Number(limit_amount), updated_at: new Date().toISOString() },
      { onConflict: "user_id,category" }
    )
    .select("id, category, limit_amount")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ budget: data });
}
