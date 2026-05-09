import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";
import { normalizeKey } from "@/lib/categorize";
import type { Category } from "@/lib/categories";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const category = body.category as Category;

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      category,
      category_source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Cache the new manual category for this merchant key
  // so future AI calls learn from the correction
  const { data: txn } = await supabase
    .from("transactions")
    .select("merchant_name, merchant_website")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (txn?.merchant_name) {
    const key = normalizeKey(txn.merchant_name);
    await supabase.from("merchant_categories").upsert(
      { user_id: user.id, merchant_key: key, category, source: "manual", last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,merchant_key" }
    );
  }

  return NextResponse.json({ ok: true });
}
