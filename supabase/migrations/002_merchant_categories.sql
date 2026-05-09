-- Migration 002: merchant_categories cache + transaction.type column

-- Add transaction type (EFTPOS, VISA, DIRECT CREDIT, etc.) from Akahu
alter table transactions
  add column if not exists type text;

-- Per-user merchant category cache.
-- merchant_key: normalised merchant name or website domain (see lib/categorize.ts normalizeKey).
-- source: 'ai' | 'manual' — rules-based hits are never cached (they're fast in-memory).
create table if not exists merchant_categories (
  merchant_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  source text not null default 'ai',
  use_count int not null default 1,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);

alter table merchant_categories enable row level security;

create policy "Users can manage own merchant cache"
  on merchant_categories for all using (auth.uid() = user_id);

create index if not exists merchant_categories_lookup
  on merchant_categories(user_id, merchant_key);
