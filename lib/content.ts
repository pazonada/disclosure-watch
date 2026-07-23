/**
 * Content loader. Fetches content JSON from GitHub raw at request time
 * instead of importing them at build time.
 *
 * Motivation: previous approach used `import documents from
 * "@/content/documents.json"` etc., which bundles the JSON into the
 * deployment at build time. That meant every content update required a
 * full Vercel rebuild to reach production — the rebuild costs added up
 * to ~$150/mo of Vercel build-CPU-minutes when we finally deployed on
 * every content commit for freshness.
 *
 * With this approach:
 *   - Content commits DO NOT require rebuilds. The site picks up new
 *     content on the next cache revalidation.
 *   - Next.js's built-in fetch cache with `revalidate: 300` (5 min)
 *     caches each JSON fetch. Under normal traffic that's a small
 *     number of fetches per hour → well under GitHub's rate limits.
 *   - Repo is private, so GITHUB_TOKEN is used to authenticate.
 *
 * Every getter is now async. Callers must `await`.
 */

import {
  UAPDocument,
  UAPEvent,
  TimelineMilestone,
  NewsItem,
  WeeklySummary,
} from "./types";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "pazonada";
const GITHUB_REPO_NAME =
  (process.env.GITHUB_REPO || "pazonada/disclosure-watch").split("/").pop() ||
  "disclosure-watch";
const GITHUB_BRANCH = "main";
const REVALIDATE_SECONDS = 300; // 5 min cache — balance freshness vs rate-limit safety

async function fetchGitHubContent<T>(pathInRepo: string, fallback: T): Promise<T> {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/content/${pathInRepo}`;
  const token = process.env.GITHUB_TOKEN;
  try {
    const resp = await fetch(url, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
      next: { revalidate: REVALIDATE_SECONDS, tags: [`content-${pathInRepo}`] },
    });
    if (!resp.ok) {
      console.error(
        `[content] GitHub raw fetch ${url} → ${resp.status}. Returning fallback.`
      );
      return fallback;
    }
    return (await resp.json()) as T;
  } catch (err) {
    console.error(`[content] fetch error for ${url}:`, err);
    return fallback;
  }
}

/**
 * Uncached variant. Use from write paths (ingest, digest jobs) that MUST
 * see HEAD to dedupe correctly against just-committed state. Anything
 * user-facing should keep using the cached getters above.
 */
export async function fetchContentFresh<T>(
  pathInRepo: string,
  fallback: T
): Promise<T> {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/content/${pathInRepo}`;
  const token = process.env.GITHUB_TOKEN;
  try {
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!resp.ok) {
      console.error(
        `[content:fresh] GitHub raw fetch ${url} → ${resp.status}. Returning fallback.`
      );
      return fallback;
    }
    return (await resp.json()) as T;
  } catch (err) {
    console.error(`[content:fresh] fetch error for ${url}:`, err);
    return fallback;
  }
}

// ── Documents ─────────────────────────────────────────────────────────

export async function getDocuments(): Promise<UAPDocument[]> {
  return fetchGitHubContent<UAPDocument[]>("documents.json", []);
}

/** All documents excluding Video and Archive categories (primary disclosure documents only). */
export async function getOfficialDocuments(): Promise<UAPDocument[]> {
  const all = await getDocuments();
  return all.filter((d) => d.category !== "Video" && d.category !== "Archive");
}

export async function getDocumentById(id: string): Promise<UAPDocument | undefined> {
  const all = await getDocuments();
  return all.find((d) => d.id === id);
}

// ── Events ────────────────────────────────────────────────────────────

export async function getEvents(): Promise<UAPEvent[]> {
  return fetchGitHubContent<UAPEvent[]>("events.json", []);
}

export async function getUpcomingEvents(): Promise<UAPEvent[]> {
  const now = new Date();
  const all = await getEvents();
  return all
    .filter((e) => new Date(e.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getPastEvents(): Promise<UAPEvent[]> {
  const now = new Date();
  const all = await getEvents();
  return all
    .filter((e) => new Date(e.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── Milestones ────────────────────────────────────────────────────────

export async function getMilestones(): Promise<TimelineMilestone[]> {
  return fetchGitHubContent<TimelineMilestone[]>("milestones.json", []);
}

// ── News ──────────────────────────────────────────────────────────────

export async function getNews(): Promise<NewsItem[]> {
  const all = await fetchGitHubContent<NewsItem[]>("news.json", []);
  return all.sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
}

/** Returns the latest N news items per source, sorted newest-first overall. */
export async function getNewsBySource(perSource = 3): Promise<Record<string, NewsItem[]>> {
  const all = await getNews();
  const grouped: Record<string, NewsItem[]> = {};
  for (const item of all) {
    if (!grouped[item.source]) grouped[item.source] = [];
    if (grouped[item.source].length < perSource) {
      grouped[item.source].push(item);
    }
  }
  return grouped;
}

// ── Weekly summary ────────────────────────────────────────────────────

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return fetchGitHubContent<WeeklySummary>("weekly-summary.json", {
    weekOf: "",
    summary: "",
  } as WeeklySummary);
}

// ── Ingest metadata ───────────────────────────────────────────────────

export interface IngestMeta {
  lastSuccessfulRun?: string;
  lastAttempt?: string;
  lastCounts?: Record<string, number>;
}

export async function getIngestMeta(): Promise<IngestMeta> {
  return fetchGitHubContent<IngestMeta>("ingest-meta.json", {});
}
