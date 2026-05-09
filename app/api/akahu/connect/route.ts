import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Saves a personal Akahu user token for the authenticated user
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string" || !token.startsWith("user_token_")) {
    return NextResponse.json(
      { error: "Invalid token — should start with user_token_" },
      { status: 400 }
    );
  }

  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      akahu_user_token: token.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true });
}
