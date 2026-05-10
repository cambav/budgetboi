import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Ensure the user_settings row exists first, then store the token in vault
  await supabase.from("user_settings").upsert(
    { user_id: user.id, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  const { error } = await supabase.rpc("save_akahu_token", { p_token: token.trim() });
  if (error) {
    console.error("vault save error:", error);
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
