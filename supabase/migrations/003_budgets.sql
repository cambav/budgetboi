-- Migration 003: per-category spending budgets

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category)
);

alter table budgets enable row level security;

create policy "Users can manage own budgets"
  on budgets for all using (auth.uid() = user_id);

create index if not exists budgets_user on budgets(user_id);
