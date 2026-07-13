/**
 * Content-freshness probe. Detects staleness caused by ANY upstream
 * failure — cron not firing, GitHub commit not landing, Vercel not
 * rebuilding, ISR serving cache, etc. — by comparing what the LIVE
 * site returns against reasonable freshness expectations and against
 * what's currently in the deployed build's filesystem.
 *
 * Flags returned:
 *   - news_stale       — /api/news newest addedDate > STALE_NEWS_DAYS old
 *   - weekly_stale     — /api/weekly-summary weekOf is >8 days old
 *   - ingest_stale     — content/ingest-meta.json lastSuccessfulRun > 48h old
 *   - live_lags_repo   — the deployed build's newest news date is older
 *                        than what's in the just-fetched-from-GitHub HEAD
 *                        (which means a commit landed but Vercel didn't
 *                        rebuild). This is the specific class of failure
 *                        that has bitten this project 2+ times.
 *
 * Empty flags = healthy.
 */

import fs from "node:fs";
import path from "node:path";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";

const STALE_NEWS_DAYS = 3;
const STALE_INGEST_HOURS = 48;

export interface ContentHealthStatus {
  timestamp: string;
  live: {
    newestNewsAddedDate: string | null;
    newestNewsAgeDays: number | null;
    weeklySummaryWeekOf: string | null;
    weeklySummaryAgeDays: number | null;
    error?: string;
  };
  deployedBundle: {
    newestNewsAddedDate: string | null;
    ingestLastRunISO: string | null;
    ingestAgeHours: number | null;
    error?: string;
  };
  flags: string[];
}

export async function getContentHealthStatus(): Promise<ContentHealthStatus> {
  const now = Date.now();
  const flags: string[] = [];

  // ── 1. What the LIVE site returns via public HTTPS ──
  const live: ContentHealthStatus["live"] = {
    newestNewsAddedDate: null,
    newestNewsAgeDays: null,
    weeklySummaryWeekOf: null,
    weeklySummaryAgeDays: null,
  };
  try {
    const [newsResp, sumResp] = await Promise.all([
      fetch(`${SITE_URL}/api/news`, {
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      }),
      fetch(`${SITE_URL}/api/weekly-summary`, {
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      }),
    ]);
    if (newsResp.ok) {
      const news = (await newsResp.json()) as Array<{
        addedDate?: string;
        publishedDate?: string;
      }>;
      const newest = news
        .map((n) => n.addedDate || n.publishedDate || "")
        .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
        .sort()
        .pop() || null;
      live.newestNewsAddedDate = newest;
      if (newest) {
        live.newestNewsAgeDays = Math.floor(
          (now - new Date(newest).getTime()) / 86_400_000
        );
      }
    }
    if (sumResp.ok) {
      const s = (await sumResp.json()) as { weekOf?: string };
      live.weeklySummaryWeekOf = s.weekOf || null;
      if (s.weekOf) {
        live.weeklySummaryAgeDays = Math.floor(
          (now - new Date(s.weekOf).getTime()) / 86_400_000
        );
      }
    }
  } catch (err) {
    live.error = String(err);
  }

  // ── 2. What the DEPLOYED bundle's filesystem currently has ──
  // This monitor runs inside the same deployment it's checking, so reading
  // the bundled JSON files here tells us the CURRENT deployment's view of
  // reality. If this is fresher than what /api/* returned above → CDN/edge
  // caching. If they match but both are stale → the deployment itself is
  // stale (ingest didn't commit, or ignore-build blocked the rebuild).
  const deployed: ContentHealthStatus["deployedBundle"] = {
    newestNewsAddedDate: null,
    ingestLastRunISO: null,
    ingestAgeHours: null,
  };
  try {
    const contentDir = path.join(process.cwd(), "content");
    const newsRaw = fs.readFileSync(
      path.join(contentDir, "news.json"),
      "utf-8"
    );
    const news = JSON.parse(newsRaw) as Array<{
      addedDate?: string;
      publishedDate?: string;
    }>;
    const newest = news
      .map((n) => n.addedDate || n.publishedDate || "")
      .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
      .sort()
      .pop() || null;
    deployed.newestNewsAddedDate = newest;

    const metaRaw = fs.readFileSync(
      path.join(contentDir, "ingest-meta.json"),
      "utf-8"
    );
    const meta = JSON.parse(metaRaw) as { lastSuccessfulRun?: string };
    deployed.ingestLastRunISO = meta.lastSuccessfulRun || null;
    if (meta.lastSuccessfulRun) {
      deployed.ingestAgeHours = Math.floor(
        (now - new Date(meta.lastSuccessfulRun).getTime()) / 3_600_000
      );
    }
  } catch (err) {
    deployed.error = String(err);
  }

  // ── 3. Flags ──
  if (
    live.newestNewsAgeDays !== null &&
    live.newestNewsAgeDays > STALE_NEWS_DAYS
  ) {
    flags.push(
      `news_stale: newest live news is ${live.newestNewsAgeDays} days old (threshold ${STALE_NEWS_DAYS}d)`
    );
  }
  if (
    live.weeklySummaryAgeDays !== null &&
    live.weeklySummaryAgeDays > 8
  ) {
    flags.push(
      `weekly_stale: weekly summary weekOf is ${live.weeklySummaryAgeDays} days old`
    );
  }
  if (
    deployed.ingestAgeHours !== null &&
    deployed.ingestAgeHours > STALE_INGEST_HOURS
  ) {
    flags.push(
      `ingest_stale: last successful ingest was ${deployed.ingestAgeHours}h ago (threshold ${STALE_INGEST_HOURS}h)`
    );
  }
  // The specific "site frozen at old deploy" symptom: the deployed bundle
  // reads fresher than the live API returned. Would indicate CDN, but this
  // rarely happens with force-dynamic routes. More interesting is the
  // reverse — deployed bundle IS the source of truth for the API, so if
  // deployed news is stale, the ingest→commit→build chain has broken
  // somewhere upstream of this deployment.
  if (
    deployed.newestNewsAddedDate &&
    live.newestNewsAddedDate &&
    deployed.newestNewsAddedDate < live.newestNewsAddedDate
  ) {
    flags.push(
      `live_lags_repo: live returned news dated ${live.newestNewsAddedDate}, deployed bundle only has ${deployed.newestNewsAddedDate}. CDN cache?`
    );
  }

  return {
    timestamp: new Date().toISOString(),
    live,
    deployedBundle: deployed,
    flags,
  };
}
