import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_settings")
    .select("pay_frequency, pay_day_of_week, pay_day_of_month, last_pay_date, setup_complete, onboarded, akahu_token_id, akahu_user_token")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    pay_frequency: data?.pay_frequency,
    pay_day_of_week: data?.pay_day_of_week,
    pay_day_of_month: data?.pay_day_of_month,
    last_pay_date: data?.last_pay_date,
    setup_complete: data?.setup_complete,
    onboarded: data?.onboarded,
    // Return boolean only — never send the raw token to the browser
    akahu_user_token: !!(data?.akahu_token_id || data?.akahu_user_token),
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["pay_frequency", "pay_day_of_week", "pay_day_of_month", "last_pay_date", "setup_complete"];
  const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  await supabase.from("user_settings").upsert(patch, { onConflict: "user_id" });
  return NextResponse.json({ ok: true });
}
