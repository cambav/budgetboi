-- Budgets per category (one row per user per category)
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric not null,
  updated_at timestamptz default now(),
  unique (user_id, category)
);
alter table budgets enable row level security;
create policy "Users can manage own budgets" on budgets
  for all using (auth.uid() = user_id);

-- User financial profile (questionnaire answers + onboarding state)
alter table user_settings
  add column if not exists profile jsonb,
  add column if not exists setup_complete boolean default false;
