---
date: 2026-05-06
status: ALERT
severity: HIGH
---

# Disclosure Watch — Content & Source Audit (2026-05-06)

## Headline

Two HIGH-severity issues require attention:

1. **Ingest pipeline has not run successfully in ~20 days.** `content/ingest-meta.json` shows `lastSuccessfulRun: 2026-04-16T09:00:45Z`. No new news, documents, or events have landed in the last 7 days (or the last 14, or 18). All upstream sources except Liberation Times are healthy, so this is a system-side stall, not a source problem.
2. **Liberation Times RSS feed is dead at the documented URL** (`/feed` → 404). Working alternate found at `/?format=rss`. Liberation Times is our highest-volume source (21 of the last 26 ingested news items, ~80%), and we are missing at least two new LT articles already (2026-05-03 and 2026-04-23).

National Archives v2 (our primary source) is healthy and configured. Congress.gov is healthy but query relevance is suspect — see Content Audit.

---

## 1. Source Health

### Primary source

| Source | Status | HTTP | Notes |
|---|---|---|---|
| **National Archives Catalog API v2** | **healthy** | 200 | `NARA_API_KEY` configured in `.env.local`. Query `?q=UAP&limit=3` returned valid JSON with `total.value=14818`, 3 hits in 1.0s. |
| National Archives Catalog API v1 | dead (expected) | 200 (HTML) | Still returning the v1-deprecated HTML landing page. No change from prior audits. |

### Government APIs

| Source | Status | HTTP | Severity if broken | Notes |
|---|---|---|---|---|
| **Congress.gov API v3** | healthy | 200 | HIGH | `?query=UAP&limit=1` returned 1 bill in 0.5s. **Quality concern:** the top hit is a 2007 House bill (110-H10, "Expressing the sense of the Congress that the tax g…") — "UAP" here is incidental. Suggests the ingest's Congress query/scoring needs review. |

### RSS feeds

| Feed | Status | HTTP | Items | Severity | Notes |
|---|---|---|---|---|---|
| DefenseScoop | healthy | 200 | 10 | — | 71 KB feed, valid RSS. |
| The Debrief — UAP category | healthy | 200 | 100 | — | 2 MB feed (large), valid RSS. |
| NewsNation — UFO | healthy | 200 | 37 | — | Valid RSS. Note duplicate-URL issue, see Content Audit. |
| **Liberation Times** | **dead** | **404** | 0 | **MEDIUM** | `https://www.liberationtimes.com/feed` returns the Squarespace 404 HTML page. **Working URL:** `https://www.liberationtimes.com/?format=rss` — 200, 387 KB, 20 items, latest 2026-05-03. Bumped from LOW to MEDIUM because LT is ~80% of our recent news volume; missing it materially degrades the site. |
| The Hill — defense | healthy | 200 | 15 | — | Valid RSS. |
| UK Defence Journal | healthy | 200 | 10 | — | Valid RSS. |

### System

| Check | Status | Severity | Notes |
|---|---|---|---|
| **Ingest pipeline** | **stalled** | **HIGH** | `ingest-meta.json` last run 2026-04-16 — ~20 days ago. Latest news `addedDate` 2026-04-16; latest documents `addedDate` 2026-04-01; latest event `addedDate` not tracked but newest event date is 2026-06-30. Sources upstream are alive (except LT). The cron, scheduled job, or whatever drives ingestion appears to have stopped firing or is failing silently. |

---

## 2. Content Audit

Strict 7-day window contained **0 new items in `documents.json`**, **0 in `news.json`**, and **2 future-dated items in `events.json`** — both pre-existing, neither newly added in the last week. Because the ingest pipeline has stalled, I extended the audit window to the most recent ingest batch (last 30 days, 26 news items) so this report is not empty.

### Items checked (last 30 days)

- News: 26 items (21 Liberation Times, 4 NewsNation, 1 UK Defence Journal).
- Documents: 0 added since 2026-04-01 (last batch was 1,192 NARA records).
- Events: 2 future-dated, both relevant.

### Flagged: duplicate

**NewsNation — Steven Garcia disappearance (2026-04-14)** appears twice with different section URLs but identical underlying article:

- "Steven Garcia's disappearance eerily like Neil McCasland's: Reporter" — `https://www.newsnationnow.com/jesse-weber-live/steven-garcia-disappearance-neil-mccasland/`
- "Steven Garcia's disappearance similar to 9 other UFO insiders: Reporter" — `https://www.newsnationnow.com/space/ufo/steven-garcia-disappearance-neil-mccasland/`

Same slug (`steven-garcia-disappearance-neil-mccasland`) under two NewsNation sections (`/jesse-weber-live/` and `/space/ufo/`). The dedupe heuristic should match on slug, not full URL.

### Flagged: borderline relevance

**NewsNation — "David Duchovny won't rule out 'X Files' reboot role, skeptical on UFOs"** (2026-04-14, `/entertainment-news/david-duchovny-x-files-skeptical-ufos/`). Tangentially UAP-adjacent (an actor's offhand UFO opinion attached to a TV-reboot story). Recommend filtering out NewsNation `/entertainment-news/` content, or requiring stronger UAP signal in body for entertainment-section items.

### Not flagged but worth noting

- The two events flagged "recent" by date (FY2026 NDAA briefing deadline, Contact in the Desert 2026) are both clearly relevant; they're future-dated, not newly added.
- Liberation Times items in the recent batch are all on-topic and high-quality. Confirms LT belongs in the source list — making the dead feed more important to fix.

---

## 3. New Sources

Investigated several candidate sources surfaced by web search. Results:

### Worth adding

- **AARO official UAP Records page** — `https://www.aaro.mil/UAP-Records/`. AARO publishes case-resolution write-ups directly. No RSS, page must be scraped. Returned 403 to a generic curl UA in this run; will need a real browser-like UA / fetch path (the same WAF likely blocks the current ingest worker too).
- **AARO EFOIA Reading Room** — `https://www.aaro.mil/EFOIA-Reading-Room/`. FOIA responses since 2022. No RSS; same scraping concern as above.
- **DoD IG FOIA Reading Room — UAP-Related Records** — `https://www.dodig.mil/FOIA/FOIA-Reading-Room/Article/3656398/uap-related-records/`. Inspector-General UAP records, distinct from AARO. No RSS, scrape required.
- **NOAA UAP/AARO FOIA reading room** — `https://www.noaa.gov/information-technology/foia-reading-room/unidentified-anomalous-phenomena-uap-and-aaro-records`. NOAA-held UAP/AARO material; smaller corpus but worth covering since NOAA wasn't in the first NARA RG-615 wave.

All four returned HTTP 403 to the audit's curl probe, but render fine in a normal browser — the block is WAF/UA filtering, not a dead endpoint. If the ingest worker uses a similar request signature it will need a UA update.

### Not recommended

- "UFO Pulse," "ufomatrix.org," and similar aggregator/blog sites surfaced in search — coverage overlaps heavily with The Debrief and Liberation Times without adding original reporting. Skip to keep noise down.

### Action item on existing source

- **Update the Liberation Times feed URL** in the ingest config from `https://www.liberationtimes.com/feed` → `https://www.liberationtimes.com/?format=rss` (Squarespace-style; verified 200, 20 items, freshest dated 2026-05-03).

### NARA RG-615 / new agency releases

NARA is releasing UAP records on a rolling basis under the 2024 NDAA. The first wave (April 2025) covered ODNI, OSD, FAA, and NRC. Web search did not surface a confirmed second wave, but per AARO public statements its caseload is now over 2,000 — implying continued transfers to NARA. Because the v2 catalog API is the entry point and is healthy, no new source needs to be added; the existing NARA ingest will pick up new RG-615 items automatically *once the ingest pipeline is restarted*.

---

## Recommended next actions (not done — read-only audit)

1. Restart / debug the ingest pipeline. Last successful run 2026-04-16; check the cron, job queue, and recent logs for the failure mode.
2. Update Liberation Times feed URL to `/?format=rss`.
3. Add NewsNation duplicate-by-slug check to the dedupe heuristic.
4. Tighten NewsNation `/entertainment-news/` filtering (or boost the UAP-keyword threshold for that section).
5. Review the Congress.gov ingest query — `query=UAP` is matching unrelated bills; consider switching to phrase or full-text API params, or post-filtering by UAP keywords in title/summary.
6. Add a UA / browser-like fetch path so AARO, DoD IG, and NOAA FOIA pages can be crawled.
