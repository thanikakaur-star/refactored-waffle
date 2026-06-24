# HealthProcure Intel — Global Healthcare Procurement Intelligence Platform

## Architecture

TypeScript/Node.js full-stack platform that aggregates global healthcare procurement data:
- **Scraper pipeline**: Playwright-based scrapers for TED Europa, SAM.gov, WHO, NHS Supply Chain
- **PostgreSQL via Supabase**: Normalized schema with currency standardization, regional benchmarks
- **Secure API tier**: Express API with tiered API key authentication (free/basic/pro/enterprise)
- **B2B Dashboard**: Tailwind CSS + Chart.js analytics dashboard for procurement visualization
- **Monetization**: Stripe subscription webhooks to provision/revoke API keys

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled server
npm run scrape       # Run all scrapers
npm run scrape:ted   # Scrape TED Europa only
npm run scrape:sam   # Scrape SAM.gov only
npm run migrate      # Run database migrations
npm run seed         # Seed sample procurement data
npm test             # Run tests (vitest)
npm run typecheck    # Type-check without emitting
```

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. Required:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `STRIPE_SECRET_KEY` | Stripe API key for subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `API_PORT` | Server port (default 3000) |

## Project Layout

- `src/server.ts` — Express entry point with API routing
- `src/config/index.ts` — Zod-validated env configuration
- `src/db/schema.sql` — Supabase PostgreSQL schema
- `src/db/client.ts` — Supabase client singleton
- `src/db/seed.ts` — Sample healthcare procurement data
- `src/scraper/base.ts` — Abstract Playwright scraper base class
- `src/scraper/sources/ted.ts` — TED Europa scraper
- `src/scraper/sources/sam.ts` — SAM.gov scraper
- `src/scraper/run.ts` — Scraper orchestrator with CLI flags
- `src/api/middleware/auth.ts` — API key authentication + tier enforcement
- `src/api/routes/tenders.ts` — Tender listing/filtering API
- `src/api/routes/awards.ts` — Contract awards API
- `src/api/routes/analytics.ts` — Dashboard statistics + benchmarks
- `src/api/routes/stripe-webhooks.ts` — Stripe subscription lifecycle
- `src/utils/currency.ts` — Multi-currency conversion (30+ currencies)
- `src/utils/logger.ts` — Structured JSON logging
- `src/types/index.ts` — TypeScript type definitions
- `dashboard/index.html` — B2B analytics dashboard (Tailwind + Chart.js)
- `tests/` — Vitest unit tests

## Conventions

- All env access goes through `src/config/index.ts` (Zod-validated)
- Use structured JSON logging via `src/utils/logger.ts`
- Stripe webhook payloads must be verified with signature before processing
- Never store customer PII in logs
- API keys use `hpi_` prefix followed by 64 hex characters
- Currency values are always normalized to USD for comparison
