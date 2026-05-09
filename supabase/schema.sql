-- budgetboi schema
-- Run this in the Supabase SQL editor

-- Enable RLS on all tables
-- User settings (one row per user)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  akahu_user_token text,
  pay_frequency text default 'fortnightly', -- 'weekly' | 'fortnightly' | 'monthly'
  pay_day_of_week int default 5,            -- 0=Sun..6=Sat, used for weekly/fortnightly
  pay_day_of_month int default 15,          -- 1–31, used for monthly
  last_pay_date date,                       -- last known payday
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "Users can manage own settings" on user_settings
  for all using (auth.uid() = user_id);

-- Bank accounts synced from Akahu
create table if not exists accounts (
  id text primary key,                      -- Akahu account ID
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  formatted_account text,
  type text,                                -- 'CHECKING' | 'SAVINGS' | 'CREDITCARD' | 'LOAN' etc
  balance numeric,
  currency text default 'NZD',
  connection_name text,                     -- bank name e.g. 'BNZ'
  is_loan boolean default false,
  last_synced timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table accounts enable row level security;
create policy "Users can manage own accounts" on accounts
  for all using (auth.uid() = user_id);

-- Transactions synced from Akahu
create table if not exists transactions (
  id text primary key,                      -- Akahu transaction ID
  user_id uuid references auth.users(id) on delete cascade,
  account_id text references accounts(id) on delete cascade,
  date timestamptz not null,
  description text,
  merchant_name text,
  merchant_website text,
  amount numeric not null,                  -- positive = credit, negative = debit
  type text,                                -- Akahu type: EFTPOS | VISA | DIRECT CREDIT | DIRECT DEBIT | etc.
  category text,
  category_source text default 'pending',  -- 'akahu' | 'rules' | 'ai' | 'manual' | 'pending'
  is_pending boolean default false,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table transactions enable row level security;
create policy "Users can manage own transactions" on transactions
  for all using (auth.uid() = user_id);
create index if not exists transactions_user_date on transactions(user_id, date desc);
create index if not exists transactions_user_category on transactions(user_id, category);

-- Per-user merchant category cache (populated by AI; rules-based hits skip this)
create table if not exists merchant_categories (
  merchant_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  source text not null default 'ai',       -- 'ai' | 'manual'
  use_count int not null default 1,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
alter table merchant_categories enable row level security;
create policy "Users can manage own merchant cache" on merchant_categories
  for all using (auth.uid() = user_id);
create index if not exists merchant_categories_lookup
  on merchant_categories(user_id, merchant_key);

-- Savings goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date,
  color text default '#163422',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table goals enable row level security;
create policy "Users can manage own goals" on goals
  for all using (auth.uid() = user_id);

-- Per-category spending budgets (limit per pay cycle)
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
create policy "Users can manage own budgets" on budgets
  for all using (auth.uid() = user_id);
create index if not exists budgets_user on budgets(user_id);

-- AI-generated insights (cached, expire after 24h)
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  insight_type text not null,              -- 'weekly_summary' | 'subscription_audit' | 'spending_pattern' | 'nudge'
  title text,
  content text not null,
  data jsonb,
  generated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);
alter table ai_insights enable row level security;
create policy "Users can manage own insights" on ai_insights
  for all using (auth.uid() = user_id);
create index if not exists ai_insights_user_type on ai_insights(user_id, insight_type, expires_at desc);
