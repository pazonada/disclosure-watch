# Direct AARO / .gov Scraper — Implementation Plan

**Status:** deferred. The current ingest pipeline catches AARO releases
*indirectly* via The Black Vault RSS (added 2026-05-14). This document is for
when we want first-party coverage with no third-party lag.

## Why this is hard

Every federal `.gov` and `.mil` domain we care about — `aaro.mil`,
`dni.gov`, `defense.gov` — sits behind Akamai's WAF and returns `403
AkamaiGHost` to programmatic fetches. Verified 2026-05-14 with `curl`
using realistic browser User-Agent from both Vercel and a residential
macOS machine: both blocked.

The block is **TLS fingerprint + JS challenge**, not source IP — a real
Chrome browser from a home connection opens these sites fine. So any
solution needs to (a) execute JavaScript, and (b) present a browser-grade
TLS fingerprint. Headless Chromium via Playwright with the
`playwright-extra` stealth plugin satisfies both.

Vercel serverless functions can't do (a) or (b). Wayback Machine's CDX
API is reliable but lagging (snapshots arrive hours-to-days late) and
incomplete for these targets.

## Free paths (preferred)

### Path 1 — GitHub Actions + Playwright (recommended)
- Repo already runs GitHub Actions for auto-ingest commits, so the
  infra is in place. Add a new workflow that boots headless Chromium,
  scrapes AARO Cases/Reports/News, diffs against a state file in the
  repo, and commits any new `UAPDocument` entries to `content/`.
- Runs on Azure-hosted runners, which Akamai usually allows through.
- Cost: **$0**. Free for public repos; 2,000 minutes/month free for
  private repos (a 6h-cadence scrape needs ~30 min/month).
- Effort: ~2 hrs.
- Risk: Akamai sometimes blocks GitHub-runner IPs in bursts. Mitigate
  by running fewer times per day and adding `playwright-extra` stealth.

### Path 2 — Local launchd + Playwright
- The same Mac that already runs `scripts/weekly-render.sh` every
  Monday via launchd can also run an AARO scraper from its home IP —
  which we know reaches AARO because a regular browser opens those
  pages fine.
- Add `scripts/aaro-scrape.mjs` that uses Playwright, runs daily via a
  new launchd plist, and `git push`es new doc entries.
- Cost: **$0**.
- Effort: ~1 hr.
- Risk: requires the Mac to be awake when the cron fires. If the
  primary user goes offline for a week, scraping pauses (acceptable —
  this is an enrichment source, not critical path).

### Path 3 — Wayback Machine CDX
- Use `web.archive.org/cdx/search/cdx` to enumerate AARO Cases/Reports
  snapshots, fetch via `web.archive.org/web/<timestamp>/<url>`.
- Cost: **$0**. No browser needed; plain `fetch()` from Vercel works.
- Effort: ~2 hrs.
- Risk: Wayback Machine snapshots lag the real site by hours to days,
  and the CDX API is slow + occasionally times out. Acceptable as a
  fallback when Paths 1/2 fail; not great as primary.

## Paid fallbacks (only if free paths fail)

### Path 4 — Render free-tier or Fly.io free-tier Playwright service
- Render has a free web service tier (256MB RAM, sleeps after 15min
  idle). Fly.io includes 3 small machines free.
- Same Playwright code as Path 1, but as a persistent service that
  Vercel hits via webhook.
- Cost: **$0** on free tiers; **~$5/mo** if the free tier proves too
  slow or limited.
- Use when: Paths 1 + 2 both fail to defeat Akamai's bot detection.

### Path 5 — Paid scraping API
- ScrapingBee, Browserless, Bright Data.
- Cost: ~$30/mo at our volume.
- Use when: only one we'll pay for if all four free paths fail.

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
