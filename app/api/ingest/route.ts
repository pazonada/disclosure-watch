import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

/**
 * POST|GET /api/ingest
 *
 * Comprehensive ingestion pipeline that keeps Disclosure Watch up-to-date.
 * Fetches from government APIs, RSS feeds, and known UAP sources, then
 * merges new items into:
 *   - content/documents.json  (government records, reports, bills)
 *   - content/news.json       (news articles and media from RSS feeds)
 *   - content/events.json     (auto-detected hearings, releases, events)
 *
 * Sources:
 *   Documents:
 *     1. National Archives Catalog API (no key needed)
 *     2. Congress.gov API (CONGRESS_API_KEY env var)
 *     3. AARO public reports page (scrape known URLs)
 *
 *   News (RSS feeds — no keys needed):
 *     - DefenseScoop (defensescoop.com/feed)
 *     - The Debrief (thedebrief.org/category/uap/feed/)
 *     - NewsNation UFO (newsnationnow.com/space/ufo/feed/)
 *     - Liberation Times (liberationtimes.com/feed)
 *     - The Hill defense (thehill.com/policy/defense/feed/)
 *     - UK Defence Journal (ukdefencejournal.org.uk/feed/)
 *     - NBC News UFO (nbcnews.com/science/ufos-aerial-phenomena — parsed)
 *     - Cybernews Cosmic Report
 *
 *   Events:
 *     - Auto-detected from news items using keyword heuristics
 *     - Congress.gov hearing search
 *
 * Environment variables:
 *   INGEST_SECRET    — bearer token to protect the endpoint
 *   CONGRESS_API_KEY — free key from https://api.congress.gov/sign-up/
 *
 * Trigger:
 *   - Vercel Cron every 6 hours (vercel.json)
 *   - Manual: curl -X POST https://yoursite.com/api/ingest \
 *       -H "Authorization: Bearer $INGEST_SECRET"
 */

// ── Shared types (mirroring lib/types.ts, kept local to avoid import issues in edge) ─

interface UAPDocument {
  id: string;
  title: string;
  source: "AARO" | "Archives" | "Congress" | "White House" | "Department of Defense" | "NASA" | "The Black Vault" | "The Debrief" | "Manual";
  sourceUrl: string;
  documentUrl?: string;
  summary: string;
  category: string;
  importance: string;
  tags: string[];
  publishedDate: string;
  addedDate: string;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  description: string;
  publishedDate: string;
  type: "article" | "video";
}

interface UAPEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  committee: string;
  sourceUrl: string;
  videoUrl: string;
  transcriptUrl: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a date string (YYYY-MM-DD) from various RSS date formats */
function parseRssDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return today();
    return d.toISOString().slice(0, 10);
  } catch {
    return today();
  }
}

/** Fetch with a timeout */
async function fetchWithTimeout(
  url: string,
  timeoutMs = 15000
): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
}

// ── Content file paths ───────────────────────────────────────────────────────

const CONTENT_DIR = path.join(process.cwd(), "content");
const DOCUMENTS_PATH = path.join(CONTENT_DIR, "documents.json");
const NEWS_PATH = path.join(CONTENT_DIR, "news.json");
const EVENTS_PATH = path.join(CONTENT_DIR, "events.json");
const WEEKLY_SUMMARY_PATH = path.join(CONTENT_DIR, "weekly-summary.json");

function loadJson<T>(filePath: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function saveJson<T>(filePath: string, data: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT SOURCES
// ══════════════════════════════════════════════════════════════════════════════

async function fetchArchives(): Promise<UAPDocument[]> {
  const results: UAPDocument[] = [];
  const queries = [
    "UAP%20unidentified%20anomalous%20phenomena",
    "unidentified%20flying%20objects%20UFO",
  ];

  for (const q of queries) {
    try {
      const url = `https://catalog.archives.gov/api/v1/?resultTypes=item&q=${q}&rows=50`;
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) continue;

      const data = (await resp.json()) as any;
      const items = data?.opaResponse?.results?.result || [];

      for (const item of items) {
        const desc =
          item?.description?.item || item?.description?.fileUnit || {};
        const title = desc?.title;
        if (!title) continue;

        const naId = desc?.naId || item?.naId;
        const sourceUrl = naId
          ? `https://catalog.archives.gov/id/${naId}`
          : "";
        const rawDate =
          desc?.productionDateArray?.proposableQualifiableDate?.logicalDate ||
          desc?.productionDate?.logicalDate ||
          "";
        const publishedDate = rawDate ? rawDate.slice(0, 10) : "1900-01-01";

        results.push({
          id: toKebab(`nara-${naId || title}`),
          title,
          source: "Archives",
          sourceUrl,
          summary:
            desc?.scopeAndContentNote ||
            `Record from the National Archives (NAID: ${naId}).`,
          category: "FOIA Release",
          importance: "Medium",
          tags: ["NARA", "Archives"],
          publishedDate,
          addedDate: today(),
        });
      }
    } catch {
      // Non-fatal
    }
  }

  return results;
}

async function fetchCongress(): Promise<UAPDocument[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return [];

  const results: UAPDocument[] = [];
  const queries = [
    "unidentified+anomalous+phenomena",
    "UAP+disclosure",
    "AARO+anomaly+resolution",
  ];

  for (const q of queries) {
    try {
      const url = `https://api.congress.gov/v3/bill?query=${q}&limit=25&api_key=${apiKey}&format=json`;
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) continue;

      const data = (await resp.json()) as any;
      const bills = data?.bills || [];

      for (const bill of bills) {
        const title = bill?.title || bill?.shortTitle;
        if (!title) continue;

        const congress = bill?.congress || "";
        const number = bill?.number || "";
        const type = (bill?.type || "").toLowerCase();
        const sourceUrl = `https://www.congress.gov/bill/${congress}th-congress/${type}-bill/${number}`;
        const dateStr =
          bill?.latestAction?.actionDate || bill?.updateDate || "";
        const publishedDate = dateStr ? dateStr.slice(0, 10) : "2024-01-01";

        results.push({
          id: toKebab(`congress-${congress}-${type}-${number}`),
          title: title.length > 200 ? title.slice(0, 197) + "..." : title,
          source: "Congress",
          sourceUrl,
          summary:
            bill?.latestAction?.text ||
            `Congressional bill from the ${congress}th Congress.`,
          category: "Report",
          importance: title.toLowerCase().includes("disclosure")
            ? "High"
            : "Medium",
          tags: ["Congress", "Legislation", `${congress}th Congress`],
          publishedDate,
          addedDate: today(),
        });
      }
    } catch {
      // Non-fatal
    }
  }

  return results;
}

/** Fetch Congress.gov hearings related to UAP */
async function fetchCongressHearings(): Promise<UAPEvent[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return [];

  const results: UAPEvent[] = [];
  const queries = [
    "unidentified+anomalous+phenomena",
    "UAP",
    "AARO",
  ];

  for (const q of queries) {
    try {
      const url = `https://api.congress.gov/v3/hearing?query=${q}&limit=20&api_key=${apiKey}&format=json`;
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) continue;

      const data = (await resp.json()) as any;
      const hearings = data?.hearings || [];

      for (const hearing of hearings) {
        const title = hearing?.title;
        if (!title) continue;

        const chamber = hearing?.chamber || "";
        const congress = hearing?.congress || "";
        const number = hearing?.number || "";
        const dateStr = hearing?.date || hearing?.updateDate || "";
        const hearingDate = dateStr ? dateStr.slice(0, 10) : "";
        if (!hearingDate) continue;

        const sourceUrl = hearing?.url ||
          `https://www.congress.gov/event/${congress}th-congress/hearing/${number}`;

        results.push({
          id: toKebab(`congress-hearing-${congress}-${chamber}-${number}`),
          title,
          description: `${chamber} hearing: ${title}`,
          date: hearingDate,
          type: "Hearing",
          committee: chamber === "Senate" ? "Senate Committee" : "House Committee",
          sourceUrl,
          videoUrl: "",
          transcriptUrl: "",
        });
      }
    } catch {
      // Non-fatal
    }
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// NEWS SOURCES (RSS)
// ══════════════════════════════════════════════════════════════════════════════

interface RssFeedConfig {
  name: string;
  url: string;
  /** Only include items whose title or description matches at least one keyword */
  filterKeywords?: string[];
}

const RSS_FEEDS: RssFeedConfig[] = [
  // ── U.S. defense / UAP-specific ──
  {
    name: "DefenseScoop",
    url: "https://defensescoop.com/feed/",
    filterKeywords: ["UAP", "UFO", "AARO", "anomalous", "unidentified", "disclosure"],
  },
  {
    name: "The Debrief",
    url: "https://thedebrief.org/category/uap/feed/",
    // Already filtered to UAP category — no extra filter needed
  },
  {
    name: "NewsNation",
    url: "https://www.newsnationnow.com/space/ufo/feed/",
  },
  {
    name: "Liberation Times",
    url: "https://www.liberationtimes.com/feed",
  },
  // ── Broader U.S. political / defense ──
  {
    name: "The Hill",
    url: "https://thehill.com/policy/defense/feed/",
    filterKeywords: ["UAP", "UFO", "AARO", "anomalous", "unidentified", "disclosure", "alien"],
  },
  {
    name: "Nextgov/FCW",
    url: "https://www.nextgov.com/rss/all/",
    filterKeywords: ["UAP", "UFO", "AARO", "anomalous", "disclosure"],
  },
  // ── International ──
  {
    name: "UK Defence Journal",
    url: "https://ukdefencejournal.org.uk/feed/",
    filterKeywords: ["UAP", "UFO", "anomalous", "unidentified"],
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    filterKeywords: ["UAP", "UFO", "anomalous phenomena", "unidentified aerial", "alien disclosure"],
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    filterKeywords: ["UAP", "UFO", "alien", "unidentified aerial", "disclosure"],
  },
  {
    name: "ABC News Australia",
    url: "https://www.abc.net.au/news/feed/2942460/rss.xml",
    filterKeywords: ["UAP", "UFO", "anomalous", "unidentified aerial"],
  },
];

/** Minimal RSS XML parser — extracts <item> elements from an RSS/Atom feed */
function parseRssItems(
  xml: string
): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }> = [];

  // Match both RSS <item> and Atom <entry>
  const itemRegex = /<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const block of matches.slice(0, 30)) {
    const title =
      block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() ||
      "";
    const link =
      block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ||
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim() ||
      "";
    const description =
      block.match(
        /<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i
      )?.[1]?.trim() || "";
    const pubDate =
      block.match(
        /<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i
      )?.[1]?.trim() || "";

    if (title && link) {
      items.push({ title: stripHtml(title), link, description, pubDate });
    }
  }

  return items;
}

/** Fetch and parse a single RSS feed, returning NewsItem candidates */
async function fetchRssFeed(config: RssFeedConfig): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  try {
    const resp = await fetchWithTimeout(config.url, 12000);
    if (!resp.ok) return results;

    const xml = await resp.text();
    const items = parseRssItems(xml);

    for (const item of items) {
      // Apply keyword filter if configured
      if (config.filterKeywords && config.filterKeywords.length > 0) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        const match = config.filterKeywords.some((kw) =>
          text.includes(kw.toLowerCase())
        );
        if (!match) continue;
      }

      const cleanDescription = stripHtml(item.description).slice(0, 400);
      const isVideo =
        item.title.toLowerCase().includes("video") ||
        item.link.includes("youtube") ||
        item.link.includes("c-span");

      results.push({
        id: toKebab(`${config.name}-${item.title}`.slice(0, 80)),
        title: item.title.slice(0, 200),
        source: config.name,
        url: item.link,
        description: cleanDescription || `${config.name} article.`,
        publishedDate: parseRssDate(item.pubDate),
        type: isVideo ? "video" : "article",
      });
    }
  } catch {
    // Non-fatal — feed might be down or slow
  }

  return results;
}

/** Fetch all RSS feeds in parallel */
async function fetchAllNews(): Promise<NewsItem[]> {
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map((config) => fetchRssFeed(config))
  );

  const allItems: NewsItem[] = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Sort by date descending
  allItems.sort(
    (a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  return allItems;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT DETECTION FROM NEWS
// ══════════════════════════════════════════════════════════════════════════════

/** Keywords that suggest a news item describes an event worth adding to events.json */
const EVENT_PATTERNS: Array<{
  keywords: string[];
  eventType: string;
}> = [
  {
    keywords: ["hearing", "testif", "subcommittee", "committee hearing"],
    eventType: "Hearing",
  },
  {
    keywords: ["classified briefing", "SCIF briefing", "closed-door briefing"],
    eventType: "Classified Briefing",
  },
  {
    keywords: ["bill signed", "signed into law", "NDAA signed", "act signed"],
    eventType: "Legislation",
  },
  {
    keywords: ["bill introduced", "legislation introduced", "act introduced", "new bill"],
    eventType: "Legislation",
  },
  {
    keywords: ["records released", "documents released", "files released", "declassified"],
    eventType: "Document Release",
  },
  {
    keywords: ["press conference", "national press club"],
    eventType: "Press Conference",
  },
  {
    keywords: ["documentary release", "film premiere", "documentary premiere"],
    eventType: "Investigation",
  },
  {
    keywords: ["executive order", "presidential directive", "presidential memorandum"],
    eventType: "Legislation",
  },
];

function detectEventsFromNews(newsItems: NewsItem[]): UAPEvent[] {
  const detected: UAPEvent[] = [];

  for (const item of newsItems) {
    const text = `${item.title} ${item.description}`.toLowerCase();

    for (const pattern of EVENT_PATTERNS) {
      const match = pattern.keywords.some((kw) => text.includes(kw));
      if (!match) continue;

      detected.push({
        id: toKebab(`auto-event-${item.title}`.slice(0, 80)),
        title: item.title,
        description: item.description,
        date: item.publishedDate,
        type: pattern.eventType,
        committee: "",
        sourceUrl: item.url,
        videoUrl: "",
        transcriptUrl: "",
      });

      // Only match one event type per news item
      break;
    }
  }

  return detected;
}

// ══════════════════════════════════════════════════════════════════════════════
// MERGE LOGIC
// ══════════════════════════════════════════════════════════════════════════════

function mergeDocuments(
  existing: UAPDocument[],
  incoming: UAPDocument[]
): { merged: UAPDocument[]; added: number } {
  const seenIds = new Set(existing.map((d) => d.id));
  const seenUrls = new Set(
    existing.map((d) => d.sourceUrl.replace(/\/$/, "").toLowerCase())
  );

  const newDocs: UAPDocument[] = [];
  for (const doc of incoming) {
    const normalUrl = doc.sourceUrl.replace(/\/$/, "").toLowerCase();
    if (!seenIds.has(doc.id) && !seenUrls.has(normalUrl)) {
      newDocs.push(doc);
      seenIds.add(doc.id);
      seenUrls.add(normalUrl);
    }
  }

  const merged = [...existing, ...newDocs].sort(
    (a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  return { merged, added: newDocs.length };
}

function mergeNews(
  existing: NewsItem[],
  incoming: NewsItem[]
): { merged: NewsItem[]; added: number } {
  const seenIds = new Set(existing.map((n) => n.id));
  const seenUrls = new Set(
    existing.map((n) => n.url.replace(/\/$/, "").toLowerCase())
  );

  const newItems: NewsItem[] = [];
  for (const item of incoming) {
    const normalUrl = item.url.replace(/\/$/, "").toLowerCase();
    if (!seenIds.has(item.id) && !seenUrls.has(normalUrl)) {
      newItems.push(item);
      seenIds.add(item.id);
      seenUrls.add(normalUrl);
    }
  }

  const merged = [...existing, ...newItems].sort(
    (a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  return { merged, added: newItems.length };
}

function mergeEvents(
  existing: UAPEvent[],
  incoming: UAPEvent[]
): { merged: UAPEvent[]; added: number } {
  const seenIds = new Set(existing.map((e) => e.id));
  const seenUrls = new Set(
    existing.map((e) => e.sourceUrl.replace(/\/$/, "").toLowerCase())
  );
  // Also check title similarity to avoid near-duplicates
  const seenTitles = new Set(
    existing.map((e) => e.title.toLowerCase().slice(0, 60))
  );

  const newEvents: UAPEvent[] = [];
  for (const event of incoming) {
    const normalUrl = event.sourceUrl.replace(/\/$/, "").toLowerCase();
    const normalTitle = event.title.toLowerCase().slice(0, 60);
    if (
      !seenIds.has(event.id) &&
      !seenUrls.has(normalUrl) &&
      !seenTitles.has(normalTitle)
    ) {
      newEvents.push(event);
      seenIds.add(event.id);
      seenUrls.add(normalUrl);
      seenTitles.add(normalTitle);
    }
  }

  const merged = [...existing, ...newEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { merged, added: newEvents.length };
}

// ══════════════════════════════════════════════════════════════════════════════
// WEEKLY SUMMARY GENERATION
// ══════════════════════════════════════════════════════════════════════════════

interface WeeklySummaryData {
  weekOf: string;
  summary: string;
}

/** Get the Monday of the current week as YYYY-MM-DD */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

/** Check if an existing summary is still current (same week) */
function summaryNeedsUpdate(weekStart: string): boolean {
  try {
    const existing = JSON.parse(
      fs.readFileSync(WEEKLY_SUMMARY_PATH, "utf-8")
    ) as WeeklySummaryData;
    return existing.weekOf !== weekStart;
  } catch {
    return true; // File missing or corrupt → needs update
  }
}

/**
 * Generate a weekly summary from recent content.
 *
 * If ANTHROPIC_API_KEY is set, uses Claude to write the summary.
 * Otherwise falls back to a template-based approach that
 * stitches together highlights from the week's content.
 */
async function generateWeeklySummary(
  docs: UAPDocument[],
  newsItems: NewsItem[],
  events: UAPEvent[]
): Promise<string> {
  const weekStart = getCurrentWeekStart();
  if (!summaryNeedsUpdate(weekStart)) {
    return ""; // Already up to date
  }

  // Gather items from the past 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recentNews = newsItems.filter((n) => n.publishedDate >= cutoffStr);
  const recentDocs = docs.filter((d) => d.publishedDate >= cutoffStr);
  const recentEvents = events.filter((e) => e.date >= cutoffStr);

  // Try Claude API first
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const summary = await generateWithClaude(
        apiKey,
        recentNews,
        recentDocs,
        recentEvents,
        docs.length,
        newsItems.length,
        events.length
      );
      if (summary) {
        const data: WeeklySummaryData = { weekOf: weekStart, summary };
        fs.writeFileSync(
          WEEKLY_SUMMARY_PATH,
          JSON.stringify(data, null, 2) + "\n"
        );
        return summary;
      }
    } catch {
      // Fall through to template
    }
  }

  // Fallback: template-based summary
  const summary = buildTemplateSummary(
    recentNews,
    recentDocs,
    recentEvents,
    docs.length,
    newsItems.length,
    events.length
  );
  const data: WeeklySummaryData = { weekOf: weekStart, summary };
  fs.writeFileSync(
    WEEKLY_SUMMARY_PATH,
    JSON.stringify(data, null, 2) + "\n"
  );
  return summary;
}

/** Use the Anthropic Messages API to write a natural weekly summary */
async function generateWithClaude(
  apiKey: string,
  recentNews: NewsItem[],
  recentDocs: UAPDocument[],
  recentEvents: UAPEvent[],
  totalDocs: number,
  totalNews: number,
  totalEvents: number
): Promise<string> {
  const newsDigest = recentNews
    .slice(0, 15)
    .map((n) => `- ${n.title} (${n.source}, ${n.publishedDate})`)
    .join("\n");
  const docDigest = recentDocs
    .slice(0, 10)
    .map((d) => `- ${d.title} (${d.source}, ${d.publishedDate})`)
    .join("\n");
  const eventDigest = recentEvents
    .slice(0, 10)
    .map((e) => `- ${e.title} (${e.type}, ${e.date})`)
    .join("\n");

  const prompt = `You write the weekly "State of Disclosure" blurb for Disclosure Watch, a site tracking UAP/UFO government disclosure. Write ONE paragraph (max 5 sentences) summarizing this week's activity. Be digestible, friendly, almost informal — like a smart friend catching you up. Mention specifics (names, numbers, sources) when interesting. Do NOT include any stats about total tracked items — those are shown separately on the site.

This week's news headlines:
${newsDigest || "(no new news this week)"}

New documents added:
${docDigest || "(no new documents this week)"}

Events:
${eventDigest || "(no new events this week)"}

Totals: ${totalDocs} documents, ${totalNews} news items, ${totalEvents} events tracked.

Write ONLY the paragraph, no intro, no quotes around it.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) return "";

  const result = (await response.json()) as any;
  const text = result?.content?.[0]?.text;
  return typeof text === "string" ? text.trim() : "";
}

/** Template-based fallback when no API key is available */
function buildTemplateSummary(
  recentNews: NewsItem[],
  recentDocs: UAPDocument[],
  recentEvents: UAPEvent[],
  totalDocs: number,
  totalNews: number,
  totalEvents: number
): string {
  const parts: string[] = [];

  // Lead with the top headline
  if (recentNews.length > 0) {
    const top = recentNews[0];
    parts.push(
      `Top story this week: ${top.title} (via ${top.source}).`
    );
  }

  // Mention document activity
  if (recentDocs.length > 0) {
    parts.push(
      `${recentDocs.length} new document${recentDocs.length > 1 ? "s" : ""} added to the tracker this week.`
    );
  }

  // Mention events
  if (recentEvents.length > 0) {
    const eventNames = recentEvents.slice(0, 2).map((e) => e.title);
    parts.push(
      `On the events front: ${eventNames.join("; ")}.`
    );
  }

  // Additional headlines
  if (recentNews.length > 1) {
    const others = recentNews
      .slice(1, 4)
      .map((n) => n.title.split(",")[0])
      .join(", ");
    parts.push(`Also making headlines: ${others}.`);
  }

  return parts.join(" ");
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERT EMAILS (disabled — will be enabled for paid tier with Stripe)
// See lib/alert-email.ts and lib/resend.ts for the full implementation.
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

async function runIngestion(): Promise<{
  documents: { fetched: number; added: number; total: number };
  news: { fetched: number; added: number; total: number };
  events: { fetched: number; added: number; total: number };
  weeklySummary: { updated: boolean };
}> {
  // 1. Load existing data
  const existingDocs = loadJson<UAPDocument>(DOCUMENTS_PATH);
  const existingNews = loadJson<NewsItem>(NEWS_PATH);
  const existingEvents = loadJson<UAPEvent>(EVENTS_PATH);

  // 2. Fetch all sources in parallel
  const [archiveDocs, congressDocs, congressHearings, allNewsItems] =
    await Promise.all([
      fetchArchives(),
      fetchCongress(),
      fetchCongressHearings(),
      fetchAllNews(),
    ]);

  // 3. Detect events from news items
  const detectedEvents = detectEventsFromNews(allNewsItems);

  // 4. Merge documents
  const incomingDocs = [...archiveDocs, ...congressDocs];
  const docResult = mergeDocuments(existingDocs, incomingDocs);
  if (docResult.added > 0) {
    saveJson(DOCUMENTS_PATH, docResult.merged);
  }

  // 5. Merge news
  const newsResult = mergeNews(existingNews, allNewsItems);
  if (newsResult.added > 0) {
    saveJson(NEWS_PATH, newsResult.merged);
  }

  // 6. Merge events (from Congress hearings API + auto-detected from news)
  const incomingEvents = [...congressHearings, ...detectedEvents];
  const eventResult = mergeEvents(existingEvents, incomingEvents);
  if (eventResult.added > 0) {
    saveJson(EVENTS_PATH, eventResult.merged);
  }

  // 7. Generate weekly summary (once per week, or if missing)
  let summaryUpdated = false;
  try {
    const summary = await generateWeeklySummary(
      docResult.merged,
      newsResult.merged,
      eventResult.merged
    );
    summaryUpdated = summary.length > 0;
  } catch {
    // Non-fatal — summary generation shouldn't break ingestion
  }

  return {
    documents: {
      fetched: incomingDocs.length,
      added: docResult.added,
      total: docResult.merged.length,
    },
    news: {
      fetched: allNewsItems.length,
      added: newsResult.added,
      total: newsResult.merged.length,
    },
    events: {
      fetched: incomingEvents.length,
      added: eventResult.added,
      total: eventResult.merged.length,
    },
    weeklySummary: { updated: summaryUpdated },
  };
}

export async function POST(request: Request) {
  // Auth check
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await runIngestion();
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    return NextResponse.json(
      { error: "Ingestion failed", details: String(err) },
      { status: 500 }
    );
  }
}

// GET handler — Vercel cron sends GET requests
export async function GET(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const cronSecret = request.headers.get("x-vercel-cron-secret") || "";

  if (secret && cronSecret !== secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return POST(request);
}
