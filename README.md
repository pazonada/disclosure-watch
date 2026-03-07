# Disclosure Watch — UAP Government Disclosure Dashboard

Track U.S. government UAP disclosure activity in one place. AARO records, congressional hearings, FOIA releases, and key milestones — summarized in plain English.

**Live at:** [disclosurewatch.com](https://disclosurewatch.com) | [disclosure.watch](https://disclosure.watch)

## Quick Start

```bash
# 1. Clone or download this project
cd uap-tracker

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

## Deploy to Vercel

```bash
# One-click deploy
npx vercel
```

Or connect this repo to Vercel via GitHub for automatic deploys on every push.

### Domain Setup

1. In Vercel dashboard, go to Settings > Domains
2. Add `disclosurewatch.com` as the primary domain
3. Add `disclosure.watch` and set it to redirect to `disclosurewatch.com`
4. Update DNS records at Gandi to point both domains to Vercel

## Adding Content

All content lives in the `content/` folder as JSON files:

- `content/documents.json` — Government records and releases
- `content/events.json` — Congressional hearings and events
- `content/milestones.json` — Disclosure timeline milestones

To add a new document, add an entry to `documents.json` following the existing schema, commit, and push. Vercel will auto-deploy.

## Setting Up Email (Optional)

1. Create a free account at [Supabase](https://supabase.com)
2. Create a `subscribers` table with columns: `email` (text, primary key), `subscribed_at` (timestamptz)
3. Create an account at [Resend](https://resend.com)
4. Copy `.env.example` to `.env.local` and fill in your keys
5. Uncomment the Supabase and Resend code in `app/api/newsletter/subscribe/route.ts`

## Tech Stack

- **Next.js 14** (App Router, ISR)
- **Tailwind CSS**
- **TypeScript**
- **Supabase** (newsletter subscribers — optional)
- **Resend** (email — optional)
- **Vercel** (hosting)

## Data Sources

- [AARO.mil](https://www.aaro.mil/UAP-Records/) — Case resolutions, imagery, reports
- [National Archives RG 615](https://www.archives.gov/research/topics/uaps/rg-615) — Historical UAP records
- [Congress.gov](https://www.congress.gov/) — Hearing schedules, legislation
- [The Debrief](https://thedebrief.org/category/uap/), [Liberation Times](https://www.liberationtimes.com), [DefenseScoop](https://defensescoop.com/) — Curated news
