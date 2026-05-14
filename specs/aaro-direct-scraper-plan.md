# Direct AARO / .gov Scraper — Implementation Plan

**Status:** deferred. The current ingest pipeline catches AARO releases
*indirectly* via The Black Vault RSS (added 2026-05-14). This document is for
when we want first-party coverage with no third-party lag.

## Why this is hard

Every federal `.gov` and `.mil` domain we care about — `aaro.mil`,
`dni.gov`, `defense.gov` — sits behind Akamai's WAF and returns `403
AkamaiGHost` to any programmatic fetch, regardless of User-Agent or headers.
This is DoD-wide policy. Verified 2026-05-14.

Vercel serverless functions (where `app/api/ingest/route.ts` runs) cannot
get past it. Wayback Machine's CDX API is unreliable for these targets.

## Three viable paths

### Path A — Playwright worker on Render / Fly.io (recommended)
- Tiny Node service running headless Chromium with a residential or
  cloud-resident IP and proper TLS fingerprint.
- Polls AARO pages on a 6h cron, diffs against a state file, and posts new
  cases/reports to a webhook on our Vercel app.
- Cost: ~$5–7/mo for a Render web service or Fly.io machine.
- Effort: ~4–6 hrs.
- Risk: Akamai bot detection may still flag headless Chromium. Mitigate
  with `playwright-extra` + stealth plugin, and slow polling.

### Path B — Paid scraping API
- ScrapingBee, Browserless, or Bright Data — pay-per-request services
  designed to defeat Akamai.
- Drop-in `fetch()` replacement inside the existing fetcher.
- Cost: ~$30–50/mo for our volume (a few hundred requests).
- Effort: ~1 hr.
- Risk: bills go up if pages change frequently; vendor lock-in.

### Path C — Email subscription → IMAP → parser
- AARO/DoD/ODNI all offer "subscribe to updates" email lists.
- Set up a dedicated inbox, IMAP it from a cron, parse update emails into
  doc entries.
- Cost: $0.
- Effort: ~3 hrs.
- Risk: depends on each agency actually sending email updates promptly;
  format changes break the parser; subject-line-only emails won't have
  enough detail.

## Targets and parse shape (when we build it)

### AARO — `aaro.mil/Resources/Cases/`
Each case typically has: case ID, title, date, summary, status, PDF link.
Maps cleanly to `UAPDocument`:
- `source`: `"AARO"`
- `category`: `"FOIA Release"` for resolved cases, `"Report"` for the
  annual UAP report.
- `documentUrl`: the PDF link.

### AARO — `aaro.mil/Resources/Reports/`
Annual UAP reports to Congress, historical record reports, threat
assessments. High-importance docs — surface as `"High"`.

### AARO — `aaro.mil/News/News-Stories/`
Press releases and AARO statements. Lower priority — DefenseScoop and The
Hill already cover these well via their RSS feeds.

### ODNI — `dni.gov/index.php/newsroom/reports-publications`
ODNI publishes the annual UAP report to Congress. Once a year. Could be
addressed by Path C (subscribe to ODNI press list) more cheaply than a
scraper.

### DoD Press Ops — `defense.gov/News/Releases/`
High volume, mostly not UAP-relevant. Would need keyword filtering
identical to the existing RSS pipeline. Marginal value — DefenseScoop
covers DoD UAP news comprehensively.

## Decision criteria for picking a path later

- If we just need the AARO annual report and 1–2 big releases per year →
  Path C (email subscription, cheapest).
- If we need real-time AARO case publishing → Path A (Playwright worker).
- If we need real-time and don't want infra overhead → Path B (paid API).

## Until we build this

The Black Vault fetcher in `app/api/ingest/route.ts` catches AARO releases
within hours-to-days. For now this is acceptable lag.
