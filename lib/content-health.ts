/**
 * Content-freshness probe. Detects staleness caused by ANY upstream
 * failure — cron not firing, GitHub commit not landing, GitHub raw
 * fetch stuck in cache, etc. — by comparing what the LIVE site returns
 * against what's currently at HEAD on main in the repo.
 *
 * Flags returned:
 *   - news_stale     — live news newest addedDate > STALE_NEWS_DAYS old
 *   - docs_stale     — live docs newest addedDate > STALE_DOCS_DAYS old
 *   - weekly_stale   — live weekly-summary weekOf is >8 days old
 *   - ingest_stale   — content/ingest-meta.json lastSuccessfulRun (from
 *                      GitHub raw HEAD) > 48h old — means the ingest
 *                      workflow itself hasn't run recently
 *   - live_lags_repo — live returned older news than what's currently
 *                      in the repo HEAD, i.e. the fetch cache is stuck
 *                      or a fetch is failing and falling back to empty
 *
 * Empty flags = healthy.
 *
 * Note: content is fetched from GitHub raw at request time (not bundled
 * at build), so the "deployed bundle" concept no longer exists — the
 * "repo" and "live" columns are functionally the same modulo the 5-min
 * fetch cache in lib/content.ts.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "pazonada";
const GITHUB_REPO_NAME =
  (process.env.GITHUB_REPO || "pazonada/disclosure-watch").split("/").pop() ||
  "disclosure-watch";
const GITHUB_BRANCH = "main";

const STALE_NEWS_DAYS = 3;
// Docs (AARO, NARA, Congress, Black Vault) publish irregularly. A dry
// spell of 2-3 weeks is normal; longer than that starts suggesting our
// scrapers or filters have silently broken. Flag at 21 days so we get
// warned before a truly abandoned pipeline sits for months.
const STALE_DOCS_DAYS = 21;
const STALE_INGEST_HOURS = 48;

export interface ContentHealthStatus {
  timestamp: string;
  live: {
    newestNewsAddedDate: string | null;
    newestNewsAgeDays: number | null;
    newestDocAddedDate: string | null;
    newestDocAgeDays: number | null;
    weeklySummaryWeekOf: string | null;
    weeklySummaryAgeDays: number | null;
    error?: string;
  };
  repo: {
    newestNewsAddedDate: string | null;
    newestDocAddedDate: string | null;
    ingestLastRunISO: string | null;
    ingestAgeHours: number | null;
    error?: string;
  };
  flags: string[];
}

async function fetchRepoJson<T>(pathInRepo: string): Promise<T | null> {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/content/${pathInRepo}`;
  const token = process.env.GITHUB_TOKEN;
  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    // Bypass cache — this probe must see HEAD, not what /api/* sees.
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) return null;
  return (await resp.json()) as T;
}

export async function getContentHealthStatus(): Promise<ContentHealthStatus> {
  const now = Date.now();
  const flags: string[] = [];

  // ── 1. What the LIVE site returns via public HTTPS ──
  // (Live is repo + a 5-min fetch cache, so it can be up to 5 min stale
  // versus repo. That's the point of comparing them.)
  const live: ContentHealthStatus["live"] = {
    newestNewsAddedDate: null,
    newestNewsAgeDays: null,
    newestDocAddedDate: null,
    newestDocAgeDays: null,
    weeklySummaryWeekOf: null,
    weeklySummaryAgeDays: null,
  };
  try {
    const [newsResp, docsResp, sumResp] = await Promise.all([
      fetch(`${SITE_URL}/api/news`, {
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      }),
      fetch(`${SITE_URL}/api/documents`, {
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
    if (docsResp.ok) {
      const docs = (await docsResp.json()) as Array<{
        addedDate?: string;
        publishedDate?: string;
      }>;
      const newest = docs
        .map((d) => d.addedDate || "")
        .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
        .sort()
        .pop() || null;
      live.newestDocAddedDate = newest;
      if (newest) {
        live.newestDocAgeDays = Math.floor(
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

  // ── 2. What's currently at HEAD in the repo ──
  // Uncached GitHub raw fetch. This is the ground truth against which
  // the live site's cached view is compared.
  const repo: ContentHealthStatus["repo"] = {
    newestNewsAddedDate: null,
    newestDocAddedDate: null,
    ingestLastRunISO: null,
    ingestAgeHours: null,
  };
  try {
    const [news, docs, meta] = await Promise.all([
      fetchRepoJson<Array<{ addedDate?: string; publishedDate?: string }>>(
        "news.json"
      ),
      fetchRepoJson<Array<{ addedDate?: string }>>("documents.json"),
      fetchRepoJson<{ lastSuccessfulRun?: string }>("ingest-meta.json"),
    ]);
    if (news) {
      repo.newestNewsAddedDate =
        news
          .map((n) => n.addedDate || n.publishedDate || "")
          .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
          .sort()
          .pop() || null;
    }
    if (docs) {
      repo.newestDocAddedDate =
        docs
          .map((d) => d.addedDate || "")
          .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
          .sort()
          .pop() || null;
    }
    if (meta) {
      repo.ingestLastRunISO = meta.lastSuccessfulRun || null;
      if (meta.lastSuccessfulRun) {
        repo.ingestAgeHours = Math.floor(
          (now - new Date(meta.lastSuccessfulRun).getTime()) / 3_600_000
        );
      }
    }
  } catch (err) {
    repo.error = String(err);
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
    live.newestDocAgeDays !== null &&
    live.newestDocAgeDays > STALE_DOCS_DAYS
  ) {
    flags.push(
      `docs_stale: newest live document is ${live.newestDocAgeDays} days old (threshold ${STALE_DOCS_DAYS}d) — check AARO/NASA/Black Vault scrapers`
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
    repo.ingestAgeHours !== null &&
    repo.ingestAgeHours > STALE_INGEST_HOURS
  ) {
    flags.push(
      `ingest_stale: last successful ingest was ${repo.ingestAgeHours}h ago (threshold ${STALE_INGEST_HOURS}h)`
    );
  }
  // Live should equal repo (modulo the 5-min fetch cache). If live is
  // materially behind repo, either the fetch cache is stuck, the private
  // repo fetch is 401ing and falling back to empty arrays, or a code
  // deploy hasn't happened since a lib/content.ts change.
  if (
    repo.newestNewsAddedDate &&
    live.newestNewsAddedDate &&
    repo.newestNewsAddedDate > live.newestNewsAddedDate
  ) {
    flags.push(
      `live_lags_repo: repo HEAD news is ${repo.newestNewsAddedDate}, live returned only ${live.newestNewsAddedDate}. GitHub raw fetch may be failing or cache is stuck.`
    );
  }

  return {
    timestamp: new Date().toISOString(),
    live,
    repo,
    flags,
  };
}
