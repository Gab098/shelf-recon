# Shelf Recon 🦝

**Shelf Recon** is a Shopify Embedded App (Remix) that acts as an AI Store Intelligence Agent for merchants:

- Store Scan (Admin GraphQL) + AI product analysis (Puter.js)
- Market Recon (Perplexity Sonar Pro via Puter.js) focusing on Reddit pain points and trends
- Paid plans unlock Product Creator and Landing Page Generator
- Shopify Billing API for subscriptions
- Polaris 12+ UI with a cyberpunk dark theme and a neon recon-raccoon mascot

## Tech

- Remix (Shopify Remix App pattern)
- Shopify App Bridge v4
- Shopify Polaris 12+
- Admin API: **GraphQL only**
- AI calls: **Puter.js only** (models: `anthropic/claude-sonnet-4`, `perplexity/sonar-pro`, `openai/gpt-4o`)
- Prisma (PostgreSQL recommended)
- Tailwind + custom CSS cyberpunk theme

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Ensure Postgres is available and `DATABASE_URL` is valid.
3. Install deps and run Prisma:
   - `npm i`
   - `npm run prisma:generate`
   - `npm run db:migrate`
4. Update `shopify.app.toml` placeholders (`client_id`, `application_url`, redirect URLs).
5. Run:
   - `npm run dev`

## Deploy

- Railway: use the included `Dockerfile` (recommended).
- Vercel: you can deploy as a container as well, or adapt to Vercel’s Remix runtime if preferred.

## Routes (Embedded)

- `/app` Dashboard
- `/app/scan` Store Scan & Analysis
- `/app/recon` Market Recon
- `/app/creator` AI Product Creator (Pro+)
- `/app/landing` Landing Page Generator (Pro+)
- `/app/plans` Pricing & Billing
- `/app/settings` Settings

