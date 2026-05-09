import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactionsPageClient from "@/components/TransactionsPageClient";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: { category?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("transactions")
    .select("id, date, description, merchant_name, amount, category, category_source, is_pending")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(500);

  if (searchParams?.from) query = query.gte("date", searchParams.from);
  if (searchParams?.to)   query = query.lte("date", searchParams.to);

  const { data: transactions } = await query;

  const dateLabel = searchParams?.from
    ? `${new Date(searchParams.from).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}${searchParams?.to ? ` – ${new Date(searchParams.to).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : "+"}`
    : undefined;

  return (
    <TransactionsPageClient
      initialTransactions={transactions ?? []}
      initialCategory={searchParams?.category ?? "all"}
      dateLabel={dateLabel}
    />
  );
}
