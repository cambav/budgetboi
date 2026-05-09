# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budgetboi is a personal finance PWA for New Zealand users. It connects to bank accounts via Akahu (NZ regulated open banking API), categorises transactions with AI, and provides budgeting, insights, and an AI chat feature.

**Current state:** A working single-file HTML dashboard (v9) is deployed at budgetboi.pages.dev with a Cloudflare Worker proxy at akahuproxy.cambav.workers.dev. This repo is a rebuild as a proper Next.js app with auth so users don't need to paste API tokens.

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run lint      # ESLint check
```

## Tech Stack

- **Next.js 14+** with App Router
- **Supabase** — auth + database
- **Akahu API** — NZ open banking (OAuth2 for multi-user, personal tokens for dev)
- **Anthropic Claude API** — AI transaction categorisation + chat
- **Tailwind CSS** with Terra Modern design system
- **Cloudflare Pages** or Vercel for deployment

## Architecture

### Auth & Data Flow

Users authenticate via Supabase, then connect their bank via Akahu OAuth2. Akahu tokens are stored per-user in Supabase. Transaction fetching hits Akahu's API server-side (via Next.js API routes or Server Components) and results are persisted to Supabase for fast querying.

### Akahu API

- Base URL: `https://api.akahu.io`
- Headers: `X-Akahu-ID` (app token), `Authorization: Bearer <user_token>`
- Key endpoints:
  - `GET /v1/accounts` — user's linked bank accounts
  - `GET /v1/transactions` — paginated via `cursor.next`, 100 per page
  - `POST /v1/refresh` — trigger account refresh
- Transactions include merchant enrichment: `merchant.name`, `merchant.website`, `category.groups.personal_finance`

### AI Features

- **Categorisation:** Misc transactions are sent to Claude for classification into the 21 categories below
- **Chat:** Claude receives the user's real transaction data as context and answers natural language finance questions

### Transaction Categories (21 + Income)

Groceries, Dining & takeaway, Fuel, Alcohol, Transport, Shopping, Subscriptions, Health & medical, Utilities, Phone & internet, Insurance, Rates, Car loan, Mortgage & loan, Daycare, Golf, Travel, Fees & fines, Transfers to others, Wedding / events, Misc, Income

### Key Business Logic

- **Pay cycle budgeting** — configurable pay day; spending resets each cycle
- **Week view** — Monday to today (not calendar week)
- **Loan detection** — by account name, type, or negative balance > $10K; loans/mortgage excluded from discretionary spend
- **Subscription detection** — recurring fixed-amount transactions
- **Income streams** — supports multiple jobs/side hustles
- **NZD / en-NZ** locale throughout

## Design System: Terra Modern

| Token | Value |
|---|---|
| Font | Outfit (Google Fonts) |
| Primary | `#163422` Deep Forest |
| Secondary | `#7d562d` Sun-kissed Clay |
| Surface | `#fcf9f8` Parchment |
| Card radius | 24px |
| Input height | 56px |
| Base spacing | 8px |

- Cards: white background, soft earth-tinted shadows
- Buttons: solid Deep Forest (primary), ghost (secondary)
- Inputs: warm gray background, 56px height
- Transaction row icons: soft rounded terra-colored squares

## NZ Context

- Currency: NZD, locale: `en-NZ`
- Common merchants: Z stations, Pak'nSave, Countdown, Bunnings, PB Tech
- Supported banks via Akahu: BNZ, NZHL, ASB, ANZ, Kiwibank, Westpac

## Implemented Features (as of May 2026)

### API Routes
- `POST /api/akahu/connect` — save Akahu personal user token
- `POST /api/akahu/sync` — full account + transaction sync (paginates all 90 days + pending)
- `POST /api/ai/categorize` — batch-categorize uncategorized transactions via Claude Haiku
- `POST /api/ai/chat` — AI chat with full transaction context (Claude Sonnet)
- `GET /api/ai/safe-to-spend` — AI-calculated safe-to-spend with status (Claude Haiku)
- `GET /api/ai/insights` — 3 proactive AI insights, cached 24h (Claude Haiku)
- `GET/POST /api/goals` — savings goals CRUD
- `GET/PATCH /api/settings` — pay cycle settings

### Pages
- `/settings` — Akahu token entry, pay cycle config (also serves as onboarding)
- `/dashboard` — hero SafeToSpend card, spending breakdown chart, AI insights, accounts, recent txns
- `/dashboard/transactions` — full transaction list (200 items)
- `/dashboard/chat` — full-screen AI chat with suggestion prompts
- `/dashboard/goals` — savings goals with progress bars

### Components
- `SafeToSpend` — polls `/api/ai/safe-to-spend`, shows amount + status badge
- `SpendingBreakdown` — donut chart + category list for current pay cycle
- `TransactionList` — transaction rows with category icons
- `InsightCards` — loads cached AI insights
- `AccountsList` — account rows with bank color badges + net/debt totals
- `ChatInterface` — chat UI with suggestions, streaming dots
- `SyncButton` — triggers sync + categorize + router.refresh

### Libs
- `lib/akahu.ts` — typed Akahu API client (accounts, full pagination, pending)
- `lib/anthropic.ts` — Anthropic client + CATEGORIES const + SYSTEM_PROMPT
- `lib/pay-cycle.ts` — pay cycle math (cycleStart, nextPayday, daysUntilNextPay)

### DB Schema
- See `supabase/schema.sql` — tables: user_settings, accounts, transactions, goals, ai_insights
- All tables have RLS policies (users can only see their own data)

## Env Vars Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
AKAHU_APP_TOKEN          # from akahu.nz developer dashboard
ANTHROPIC_API_KEY        # from console.anthropic.com
NEXT_PUBLIC_SITE_URL     # e.g. https://budgetboi.pages.dev
```
