# ApplyPilot

ApplyPilot is an AI-assisted job application workflow app built with Next.js and Supabase.

## Stack
- Next.js 15 (App Router) + TypeScript
- Supabase Auth + Postgres (RLS enabled)
- Tailwind CSS + shadcn/ui
- GLM API for generation

## Core Features
- Resume vault (manual and PDF import)
- Targeted package generation (cover letter + tailored resume + interview prep)
- Application tracker with workflow stages and follow-up timing
- Analytics event tracking
- Usage metering and monthly quota enforcement

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy environment variables:
```bash
cp .env.example .env.local
```
3. Fill `.env.local` values.
4. Run database migrations with Supabase CLI.
5. Start development server:
```bash
npm run dev
```

## Environment Variables
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GLM_API_URL`
- `GLM_API_KEY`

Optional but recommended:
- `GLM_MODEL`, `GLM_FALLBACK_MODEL`, `GLM_MODELS`
- `GLM_TIMEOUT_MS`, `GLM_MAX_OUTPUT_TOKENS`
- `GENERATION_MONTHLY_LIMIT`
- `HEALTHCHECK_SECRET` (protect `/api/health` in production)

## Scripts
- `npm run dev` - start local dev server
- `npm run lint` - lint
- `npm run typecheck` - TypeScript checks
- `npm run build` - production build
- `npm run test:smoke` - lint + typecheck + build
- `npm run test:ai-regression` - offline AI output regression gate (prompt leakage/format checks)
- `npm run test:e2e` - Playwright end-to-end smoke tests

## Production Hardening Notes
- RLS is enabled for all user-owned tables.
- Server and client analytics write paths are non-blocking.
- Generation and import paths include burst-rate limiting guards.
- `/api/health` supports secret-based protection in production.
- Security headers and baseline CSP are enforced through `next.config.js`.

## Observability Retention
- `analytics_events` retention target: 180 days
- `ai_generation_usage` retention target: 365 days
- Maintenance function: `public.prune_observability_data()`
- Optional daily cron job name: `applypilot_prune_observability` (03:15 server time)

Run manually as service role when needed:
```sql
select * from public.prune_observability_data();
```

## Deploy
Deploy on Vercel or any Node-compatible host.
- Configure the same environment variables from `.env.example`.
- Run `npm run build` in CI before deploy.

## Status
This repository is ready for public production with environment hardening, legal review, billing integration, and monitoring configured in your deployment environment.

## AI Eval Harness
- Fixture file: `scripts/fixtures/ai-regression-cases.json`
- Runner: `scripts/ai-regression-eval.mjs`
- CI threshold env (optional): `AI_EVAL_MIN_PASS_RATE` (default `0.9`)

Run locally:
```bash
npm run test:ai-regression
```
