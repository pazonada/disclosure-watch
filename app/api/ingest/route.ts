import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { commitFiles, type FileUpdate } from "@/lib/github";
import { fetchContentFresh } from "@/lib/content";
import { nowET, todayET } from "@/lib/utils";
import type { AlertItem } from "@/lib/alert-email";
import { dispatchAlertsToSubscribers } from "@/lib/alert-dispatcher";

export const dynamic = "force-dynamic";

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
 *     1. National Archives Catalog API v2 (NARA_API_KEY env var)
 *     2. Congress.gov API (CONGRESS_API_KEY env var)
 *     3. AARO public reports page (scrape known URLs)
 *
 *   News (RSS feeds — no keys needed):
 *     - DefenseScoop (defensescoop.com/feed)
 *     - The Debrief (thedebrief.org/category/uap/feed/)
 *     - NewsNation UFO (newsnationnow.com/space/ufo/feed/)
 *     - Liberation Times (liberationtimes.com/?format=rss)
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
 *   NARA_API_KEY     — free key from https://catalog.archives.gov/api/v2/
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
  addedDate?: string;
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
  return todayET();
}

/** Keywords that indicate genuine UAP/UFO/disclosure relevance */
const UAP_RELEVANCE_KEYWORDS = [
  "uap", "ufo", "unidentified anomalous", "unidentified aerial",
  "anomalous phenomena", "flying object", "flying objects",
  "aaro", "all-domain anomaly resolution",
  "aatip", "aawsap", "advanced aerospace threat",
  "immaculate constellation", "yankee blue", "tic tac",
  "disclosure", "non-human intelligence", "nhi",
  "extraterrestrial", "roswell", "area 51",
  "grusch", "elizondo", "fravor", "graves",
  "imminent domain", "uap disclosure act",
  "schumer", "rounds", "gillibrand", "burchett", "luna", "gaetz", "rubio",
];

/** Check if text is genuinely about UAP/UFO disclosure */
function isUapRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return UAP_RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Stricter UAP match for sources where false positives are common (e.g. Federal
 * Register, where "UAP" can collide with unrelated acronyms). Requires an
 * unambiguous UAP/UFO/AARO reference, with word boundaries for short acronyms.
 */
function isStrongUapDocMatch(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("unidentified anomalous phenomena")) return true;
  if (lower.includes("unidentified aerial phenomena")) return true;
  if (lower.includes("all-domain anomaly resolution")) return true;
  if (/\baaro\b/i.test(text)) return true;
  if (/\buap\b/i.test(text) && /\b(phenomena|disclosure|object|sighting|report|review|office|incident)\b/i.test(text)) return true;
  if (/\bufo\b/i.test(text) && /\b(disclosure|file|release|sighting|incident|report)\b/i.test(text)) return true;
  return false;
}

/** Map Congress.gov bill type codes to URL-friendly slugs */
function congressBillSlug(type: string): string {
  const map: Record<string, string> = {
    hr: "house-bill",
    s: "senate-bill",
    hres: "house-resolution",
    sres: "senate-resolution",
    hjres: "house-joint-resolution",
    sjres: "senate-joint-resolution",
    hconres: "house-concurrent-resolution",
    sconres: "senate-concurrent-resolution",
  };
  return map[type.toLowerCase()] || "house-bill";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    // Decode numeric entities (e.g. &#8220; → ", &#8217; → ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    // Decode hex entities (e.g. &#x2019; → ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    // Common named entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026")
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

// ── Content loaders ──────────────────────────────────────────────────────────
// Reads go to GitHub raw at HEAD (cache: no-store) rather than the deployment
// filesystem. The deployment doesn't rebuild on content commits anymore, so
// fs reads would return days-old state and cause dedup to overwrite newer
// commits — data loss. See lib/content.ts:fetchContentFresh for details.

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT SOURCES
// ══════════════════════════════════════════════════════════════════════════════

async function fetchArchives(): Promise<UAPDocument[]> {
  const naraKey = process.env.NARA_API_KEY;
  if (!naraKey) {
    console.log("[Archives] No NARA_API_KEY set. Skipping National Archives.");
    return [];
  }

  const results: UAPDocument[] = [];
  const baseUrl = "https://catalog.archives.gov/api/v2/records/search";
  const queries: Array<{ params: string; isRG615: boolean }> = [
    { params: "q=UAP+OR+%22unidentified+anomalous+phenomena%22&recordGroupNumber=615&limit=100", isRG615: true },
    { params: "q=UAP+OR+UFO+OR+%22unidentified+aerial+phenomena%22&online=true&limit=50", isRG615: false },
  ];

  for (const { params: queryParams, isRG615 } of queries) {
    try {
      // Paginate with a cap to stay within Vercel's function timeout.
      // RG615 has ~700 records; the broader query can return 10,000+.
      const PAGE_SIZE = isRG615 ? 100 : 50;
      const MAX_RECORDS = isRG615 ? 1000 : 200;
      let from = 0;
      let totalFetched = 0;

      while (totalFetched < MAX_RECORDS) {
        const url = `${baseUrl}?${queryParams}&from=${from}`;
        console.log(`[Archives] Fetching: ${url.slice(0, 120)}...`);
        const resp = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": naraKey,
          },
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) {
          console.log(`[Archives] API returned ${resp.status}`);
          break;
        }

        const data = (await resp.json()) as any;
        const hits = data?.body?.hits?.hits || [];
        totalFetched += hits.length;
        console.log(`[Archives] Page at offset ${from}: ${hits.length} items (${totalFetched} total)`);

        for (const hit of hits) {
          const record = hit?._source?.record;
          if (!record) continue;

          const title = record.title;
          if (!title) continue;

          const scopeNote = record.scopeAndContentNote || "";
          // RG615 records are all UAP-related; only filter the broader query
          if (!isRG615 && !isUapRelevant(`${title} ${scopeNote}`)) continue;

          const naId = record.naId;
          const sourceUrl = naId
            ? `https://catalog.archives.gov/id/${naId}`
            : "";

          // Extract date from v2 fields — try multiple date sources
          const startDate =
            record.coverageStartDate ||
            record.inclusiveStartDate ||
            record.productionDates?.[0];
          let publishedDate = "unknown";
          if (startDate?.logicalDate) {
            publishedDate = startDate.logicalDate.slice(0, 10);
          } else if (startDate?.year) {
            const y = startDate.year;
            const m = String(startDate.month || 1).padStart(2, "0");
            const d = String(startDate.day || 1).padStart(2, "0");
            publishedDate = `${y}-${m}-${d}`;
          }
          // Fallback: extract date from title (e.g. "UAP 11/11/2022")
          if (publishedDate === "unknown") {
            const titleDateMatch = title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (titleDateMatch) {
              const [, mm, dd, yyyy] = titleDateMatch;
              publishedDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
            } else {
              const yearMatch = title.match(/\b(20\d{2})\b/);
              if (yearMatch) publishedDate = `${yearMatch[1]}-01-01`;
            }
          }

          // Get document download URL from digital objects if available
          const digitalObjects = record.digitalObjects || [];
          const documentUrl = digitalObjects[0]?.objectUrl || undefined;

          results.push({
            id: toKebab(`nara-${naId || title}`),
            title,
            source: "Archives",
            sourceUrl,
            documentUrl,
            summary:
              scopeNote ||
              `Record from the National Archives (NAID: ${naId}).`,
            category: "FOIA Release",
            importance: "Medium",
            tags: isRG615 ? ["NARA", "Archives", "Record Group 615"] : ["NARA", "Archives"],
            publishedDate,
            addedDate: today(),
          });
        }

        // Stop if we got fewer results than the page size (last page)
        if (hits.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
        if (totalFetched >= MAX_RECORDS) {
          console.log(`[Archives] Hit ${MAX_RECORDS}-record cap for query. Stopping pagination.`);
        }
      }
    } catch (err) {
      console.error("[Archives] Error:", err);
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

        const summaryText = bill?.latestAction?.text || "";
        // Skip bills that aren't actually about UAP/disclosure
        if (!isUapRelevant(`${title} ${summaryText}`)) continue;

        const congress = bill?.congress || "";
        const number = bill?.number || "";
        const type = (bill?.type || "").toLowerCase();
        const slug = congressBillSlug(type);
        const sourceUrl = bill?.url
          ? bill.url.replace("api.congress.gov/v3", "www.congress.gov")
          : `https://www.congress.gov/bill/${congress}th-congress/${slug}/${number}`;
        const dateStr =
          bill?.latestAction?.actionDate || bill?.updateDate || "";
        const publishedDate = dateStr ? dateStr.slice(0, 10) : "2024-01-01";

        results.push({
          id: toKebab(`congress-${congress}-${type}-${number}`),
          title: title.length > 200 ? title.slice(0, 197) + "..." : title,
          source: "Congress",
          sourceUrl,
          summary:
            summaryText ||
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

        // Skip hearings that aren't actually about UAP/disclosure
        if (!isUapRelevant(title)) continue;

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
// PRIMARY-SOURCE DOCUMENTS: The Black Vault + Federal Register
// ══════════════════════════════════════════════════════════════════════════════

/**
 * The Black Vault is a 25-year-old FOIA archive run by John Greenewald. Its
 * documentarchive feed is the most reliable public aggregator of primary-source
 * UAP/UFO releases from AARO, DoD, NASA, ODNI, and federal FOIA responses —
 * which we cannot scrape directly because all .mil/.gov domains are gated by
 * Akamai WAF. TBV typically posts releases within hours of public availability
 * and links the original documents.
 */
async function fetchBlackVault(): Promise<UAPDocument[]> {
  const FEED_URL = "https://www.theblackvault.com/documentarchive/feed/";
  const results: UAPDocument[] = [];

  try {
    const resp = await fetchWithTimeout(FEED_URL, 12000);
    if (!resp.ok) {
      console.log(`[BlackVault] Feed returned ${resp.status}`);
      return results;
    }

    const xml = await resp.text();
    const items = parseRssItems(xml);

    for (const item of items) {
      const cleanTitle = stripHtml(item.title);
      const cleanDescription = stripHtml(item.description);
      const haystack = `${cleanTitle} ${cleanDescription}`;

      // TBV publishes JFK files, MKULTRA, etc. too — filter to UAP-relevant.
      if (!isUapRelevant(haystack)) continue;

      // Strip RSS tracking params so URLs dedupe cleanly against any prior
      // entry that was captured elsewhere.
      const cleanUrl = item.link.split("?")[0];

      // Heuristic importance: high-signal keywords bump it up.
      const lower = haystack.toLowerCase();
      let importance: "High" | "Medium" | "Low" = "Medium";
      if (
        lower.includes("aaro") ||
        lower.includes("pentagon") ||
        lower.includes("congress") ||
        lower.includes("executive order")
      ) {
        importance = "High";
      }

      results.push({
        id: toKebab(`tbv-${cleanTitle}`.slice(0, 80)),
        title: cleanTitle.slice(0, 200),
        source: "The Black Vault",
        sourceUrl: cleanUrl,
        summary: cleanDescription.slice(0, 400) || "FOIA document release archived by The Black Vault.",
        category: "FOIA Release",
        importance,
        tags: ["FOIA", "The Black Vault", "Primary Source"],
        publishedDate: parseRssDate(item.pubDate),
        addedDate: today(),
      });
    }

    console.log(`[BlackVault] Fetched ${results.length} UAP-relevant items`);
  } catch (err) {
    console.error("[BlackVault] Error:", err);
  }

  return results;
}

/**
 * Federal Register API — for executive orders, agency rules, and official
 * notices that mention UAP/AARO. Low volume but catches authoritative actions
 * that bypass news coverage (e.g. DoD Privacy Act notices for AARO systems
 * of records).
 *
 * The API's "term" search is loose, so we post-filter with isStrongUapDocMatch.
 */
async function fetchFederalRegister(): Promise<UAPDocument[]> {
  const results: UAPDocument[] = [];

  // 365-day window — FR publishes infrequently enough that anything older has
  // already been seen by previous ingest runs.
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const fromStr = fromDate.toISOString().slice(0, 10);

  const queries = [
    "unidentified anomalous phenomena",
    "all-domain anomaly resolution",
  ];

  for (const term of queries) {
    try {
      const url =
        "https://www.federalregister.gov/api/v1/documents.json" +
        `?per_page=50&order=newest` +
        `&conditions%5Bterm%5D=${encodeURIComponent(term)}` +
        `&conditions%5Bpublication_date%5D%5Bgte%5D=${fromStr}`;

      const resp = await fetchWithTimeout(url, 15000);
      if (!resp.ok) {
        console.log(`[FedReg] API returned ${resp.status} for "${term}"`);
        continue;
      }

      const data = (await resp.json()) as {
        results?: Array<{
          document_number?: string;
          title?: string;
          abstract?: string;
          publication_date?: string;
          html_url?: string;
          pdf_url?: string;
          type?: string;
          agencies?: Array<{ raw_name?: string; name?: string }>;
        }>;
      };

      for (const r of data.results || []) {
        const title = r.title || "";
        const abstract = r.abstract || "";
        const haystack = `${title} ${abstract}`;

        if (!isStrongUapDocMatch(haystack)) continue;

        const agencyNames =
          r.agencies?.map((a) => a.name || a.raw_name).filter(Boolean) || [];
        const isDoDOrODNI = agencyNames.some(
          (n) =>
            /defense/i.test(n!) ||
            /national intelligence/i.test(n!) ||
            /executive office/i.test(n!)
        );
        // Skip anything that isn't a defense/intel-adjacent agency — collateral
        // mentions in unrelated agency rules don't belong as primary docs.
        if (!isDoDOrODNI) continue;

        const category = mapFederalRegisterType(r.type);

        results.push({
          id: toKebab(`fr-${r.document_number || title}`.slice(0, 80)),
          title: title.slice(0, 200),
          source: "Department of Defense",
          sourceUrl: r.html_url || "",
          documentUrl: r.pdf_url || undefined,
          summary: abstract.slice(0, 400) || "Federal Register entry.",
          category,
          importance: r.type === "Presidential Document" ? "High" : "Medium",
          tags: ["Federal Register", ...agencyNames.slice(0, 2).filter(Boolean) as string[]],
          publishedDate: r.publication_date || today(),
          addedDate: today(),
        });
      }
    } catch (err) {
      console.error(`[FedReg] Error for "${term}":`, err);
    }
  }

  console.log(`[FedReg] Fetched ${results.length} UAP-relevant entries`);
  return results;
}

function mapFederalRegisterType(t?: string): string {
  switch (t) {
    case "Presidential Document":
      return "Executive Order";
    case "Rule":
    case "Proposed Rule":
      return "Official Statement";
    case "Notice":
      return "Press Release";
    default:
      return "Official Statement";
  }
}

/**
 * NASA UAP page scraper. science.nasa.gov/uap is plain HTML (no Akamai
 * block, unlike .mil/aaro.mil) so we can fetch it directly from Vercel.
 * The page lists PDFs: the 2023 Independent Study Team report + related
 * meeting materials. New NASA UAP documents are rare but high-importance
 * when they drop. Dedup-by-URL in mergeDocuments handles re-runs without
 * a separate state file.
 */
async function fetchNasaUap(): Promise<UAPDocument[]> {
  const PAGE_URL = "https://science.nasa.gov/uap";
  const results: UAPDocument[] = [];

  try {
    const resp = await fetchWithTimeout(PAGE_URL, 15000);
    if (!resp.ok) {
      console.log(`[NASA] science.nasa.gov/uap returned ${resp.status}`);
      return results;
    }
    const html = await resp.text();

    // Pull every PDF link on the page that NASA hosts. We don't try to
    // categorise here — we just capture them, and the existing dedup
    // ensures we only add new ones on subsequent runs.
    const pdfLinks = new Set<string>();
    const linkRe = /href="(https:\/\/(?:science|www)\.nasa\.gov\/[^"]+\.pdf)"/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null) {
      pdfLinks.add(m[1]);
    }

    for (const url of Array.from(pdfLinks)) {
      // Derive a human-readable title from the filename.
      const filename = url.split("/").pop() || "nasa-uap-document.pdf";
      const baseName = filename
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\btagged\b/gi, "")
        .replace(/\b(\d{1,2})\s*(\d{4})\b/, "$1/$2")
        .trim();
      const title = `NASA · ${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;

      // Try to extract a year from the URL path (NASA puts uploads in
      // /YYYY/MM/ folders) to use as the publishedDate.
      const yearMonthMatch = url.match(/\/(\d{4})\/(\d{1,2})\//);
      let publishedDate: string;
      if (yearMonthMatch) {
        const [, y, mo] = yearMonthMatch;
        publishedDate = `${y}-${mo.padStart(2, "0")}-01`;
      } else {
        publishedDate = today();
      }

      results.push({
        id: toKebab(`nasa-${baseName}`.slice(0, 80)),
        title: title.slice(0, 200),
        source: "NASA",
        sourceUrl: PAGE_URL,
        documentUrl: url,
        summary: `NASA-published UAP document linked from science.nasa.gov/uap.`,
        category: filename.toLowerCase().includes("report") ? "Report" : "Official Statement",
        importance: filename.toLowerCase().includes("final-report") ? "High" : "Medium",
        tags: ["NASA", "UAP", "Primary Source"],
        publishedDate,
        addedDate: today(),
      });
    }

    console.log(`[NASA] Fetched ${results.length} NASA UAP documents`);
  } catch (err) {
    console.error("[NASA] Error:", err);
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
    url: "https://www.liberationtimes.com/?format=rss",
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

  const now = today();
  const newItems: NewsItem[] = [];
  for (const item of incoming) {
    const normalUrl = item.url.replace(/\/$/, "").toLowerCase();
    if (!seenIds.has(item.id) && !seenUrls.has(normalUrl)) {
      newItems.push({ ...item, addedDate: now });
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
  const now = nowET();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Check if an existing summary is still current (same week) and non-empty */
async function summaryNeedsUpdate(weekStart: string): Promise<boolean> {
  const existing = await fetchContentFresh<WeeklySummaryData | null>(
    "weekly-summary.json",
    null
  );
  if (!existing) return true; // Missing or fetch failed → treat as needing update
  if (existing.weekOf !== weekStart) return true;
  if (!existing.summary || existing.summary.trim().length < 20) return true;
  return false;
}

/**
 * Generate a weekly summary from recent content.
 *
 * If ANTHROPIC_API_KEY is set, uses Claude to write the summary.
 * Otherwise falls back to a template-based approach that
 * stitches together highlights from the week's content.
 *
 * Returns the summary data object (for GitHub commit), or null if
 * the summary is already current.
 */
async function generateWeeklySummary(
  docs: UAPDocument[],
  newsItems: NewsItem[],
  events: UAPEvent[]
): Promise<WeeklySummaryData | null> {
  const weekStart = getCurrentWeekStart();
  if (!(await summaryNeedsUpdate(weekStart))) {
    return null; // Already up to date
  }

  // Gather items from the past 14 days so we always have content for the summary.
  // Use a generous window: items from the last two weeks by either publish or add date.
  const cutoff = nowET();
  cutoff.setDate(cutoff.getDate() - 14);
  const cy = cutoff.getFullYear();
  const cm = String(cutoff.getMonth() + 1).padStart(2, "0");
  const cd = String(cutoff.getDate()).padStart(2, "0");
  const cutoffStr = `${cy}-${cm}-${cd}`;

  const recentNews = newsItems.filter((n) => n.publishedDate >= cutoffStr);
  const recentDocs = docs.filter((d) => (d.addedDate || d.publishedDate) >= cutoffStr);
  const recentEvents = events.filter((e) => e.date >= cutoffStr);

  // Try Claude API first
  let summary = "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      summary = await generateWithClaude(
        apiKey,
        recentNews,
        recentDocs,
        recentEvents,
        docs.length,
        newsItems.length,
        events.length
      );
    } catch (err) {
      console.error("[WeeklySummary] Claude API failed:", err);
    }
  }

  // Fallback: template-based summary
  if (!summary) {
    summary = buildTemplateSummary(
      recentNews,
      recentDocs,
      recentEvents,
      docs.length,
      newsItems.length,
      events.length
    );
  }

  // Last resort: never commit an empty summary
  if (!summary || summary.trim().length < 20) {
    console.warn("[WeeklySummary] No content for summary — skipping (will retry next run)");
    return null;
  }

  const data: WeeklySummaryData = { weekOf: weekStart, summary };
  await upsertDigestDraft(weekStart, summary);
  return data;
}

/** Create or update a digest row in Supabase for this week's summary. */
async function upsertDigestDraft(weekOf: string, summaryText: string) {
  try {
    // Calculate Friday 12pm ET as the auto-send deadline
    const weekDate = new Date(weekOf + "T00:00:00");
    const dayOfWeek = weekDate.getDay(); // 0=Sun, 1=Mon
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(weekDate);
    friday.setDate(friday.getDate() + daysUntilFriday);
    // Friday 12:00 PM ET = 17:00 UTC (EST) or 16:00 UTC (EDT)
    // Use 17:00 UTC as a safe default (EST)
    friday.setUTCHours(17, 0, 0, 0);

    await supabase.from("digests").upsert(
      {
        week_of: weekOf,
        summary_text: summaryText,
        status: "draft",
        auto_send_deadline: friday.toISOString(),
      },
      { onConflict: "week_of", ignoreDuplicates: false }
    );
  } catch (err) {
    console.error("Failed to upsert digest draft:", err);
  }
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

  const prompt = `You write the weekly "State of Disclosure" blurb for Disclosure Watch, a site that tracks UAP/UFO government disclosure for a general audience.

TASK: Write ONE paragraph (max 5 sentences) summarizing this week's activity. Mention specifics (names, bill numbers, agencies, dates) when they add clarity. Do NOT include any stats about total tracked items – those are shown separately on the site.

VOICE & STYLE:
- Sound like an informed adult catching a friend up on the week – not academic, not clickbait. Accessible to the average person curious about UAPs, without dumbing things down.
- Lean heavily toward straight reporting. State what happened and what it means. Avoid personal opinion, but it's fine to briefly note concrete implications ("This is the first time Congress has…" or "The provision would require the Pentagon to…").
- Vary sentence length naturally. Keep things moving.
- NEVER use em dashes (—). If you need a parenthetical aside, use an en dash ( – ) sparingly, or restructure the sentence.
- Avoid overused LLM filler: "In a significant development," "It remains to be seen," "This marks a pivotal," "It's worth noting," "Notably," etc.
- No emojis. No exclamation marks unless quoting someone.

This week's news headlines:
${newsDigest || "(no new news this week)"}

New documents added:
${docDigest || "(no new documents this week)"}

Events:
${eventDigest || "(no new events this week)"}

Write ONLY the paragraph. No intro, no sign-off, no quotes around it.`;

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
// ALERT DISPATCH (paid subscribers)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert newly ingested items into AlertItem format and dispatch
 * to paid subscribers via the /api/alerts/dispatch endpoint.
 */
async function dispatchAlerts(
  newDocs: UAPDocument[],
  newNews: NewsItem[],
  newEvents: UAPEvent[]
): Promise<{ dispatched: boolean; error?: string }> {
  const items: AlertItem[] = [];

  for (const doc of newDocs) {
    items.push({
      title: doc.title,
      type: "document",
      url: doc.sourceUrl,
      summary: doc.summary,
      date: doc.publishedDate,
    });
  }

  for (const news of newNews) {
    items.push({
      title: news.title,
      type: "news",
      url: news.url,
      summary: news.description,
      date: news.publishedDate,
    });
  }

  for (const event of newEvents) {
    items.push({
      title: event.title,
      type: "event",
      url: event.sourceUrl,
      summary: event.description,
      date: event.date,
    });
  }

  if (items.length === 0) return { dispatched: false };

  try {
    // Call the dispatcher directly in-process. This avoids an HTTP
    // round-trip through the public domain (which was failing silently
    // when NEXT_PUBLIC_SITE_URL wasn't set or the public URL returned 401).
    const result = await dispatchAlertsToSubscribers(items);
    console.log(`[Ingest] Dispatched alerts: sent=${result.sent}, skipped=${result.skipped}, subs=${result.totalSubscribers}${result.reason ? ` (${result.reason})` : ""}`);
    if (result.error) {
      return { dispatched: false, error: result.error };
    }
    return { dispatched: result.sent > 0 };
  } catch (err) {
    console.error("Alert dispatch error:", err);
    return { dispatched: false, error: String(err) };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

async function runIngestion(): Promise<{
  documents: { fetched: number; added: number; total: number };
  news: { fetched: number; added: number; total: number };
  events: { fetched: number; added: number; total: number };
  weeklySummary: { updated: boolean };
  alerts: { dispatched: boolean; error?: string };
  committed: boolean;
}> {
  // Collect files to commit to GitHub at the end
  const filesToCommit: FileUpdate[] = [];

  // 1. Load existing data from GitHub HEAD (no-cache). fs would return
  //    stale bundle since content commits skip Vercel builds.
  const [existingDocs, existingNews, existingEvents] = await Promise.all([
    fetchContentFresh<UAPDocument[]>("documents.json", []),
    fetchContentFresh<NewsItem[]>("news.json", []),
    fetchContentFresh<UAPEvent[]>("events.json", []),
  ]);

  // 2. Fetch all sources in parallel
  const [
    archiveDocs,
    congressDocs,
    blackVaultDocs,
    fedRegDocs,
    nasaDocs,
    congressHearings,
    allNewsItems,
  ] = await Promise.all([
    fetchArchives(),
    fetchCongress(),
    fetchBlackVault(),
    fetchFederalRegister(),
    fetchNasaUap(),
    fetchCongressHearings(),
    fetchAllNews(),
  ]);

  // 3. Detect events from news items
  const detectedEvents = detectEventsFromNews(allNewsItems);

  // 4. Merge documents
  const incomingDocs = [
    ...archiveDocs,
    ...congressDocs,
    ...blackVaultDocs,
    ...fedRegDocs,
    ...nasaDocs,
  ];
  const existingDocIds = new Set(existingDocs.map((d) => d.id));
  const docResult = mergeDocuments(existingDocs, incomingDocs);
  if (docResult.added > 0) {
    filesToCommit.push({
      path: "content/documents.json",
      content: JSON.stringify(docResult.merged, null, 2) + "\n",
    });
  }
  const newlyAddedDocs = docResult.merged.filter((d) => !existingDocIds.has(d.id));

  // 5. Merge news
  const existingNewsIds = new Set(existingNews.map((n) => n.id));
  const newsResult = mergeNews(existingNews, allNewsItems);
  if (newsResult.added > 0) {
    filesToCommit.push({
      path: "content/news.json",
      content: JSON.stringify(newsResult.merged, null, 2) + "\n",
    });
  }
  const newlyAddedNews = newsResult.merged.filter((n) => !existingNewsIds.has(n.id));

  // 6. Merge events (from Congress hearings API + auto-detected from news)
  const incomingEvents = [...congressHearings, ...detectedEvents];
  const existingEventIds = new Set(existingEvents.map((e) => e.id));
  const eventResult = mergeEvents(existingEvents, incomingEvents);
  if (eventResult.added > 0) {
    filesToCommit.push({
      path: "content/events.json",
      content: JSON.stringify(eventResult.merged, null, 2) + "\n",
    });
  }
  const newlyAddedEvents = eventResult.merged.filter((e) => !existingEventIds.has(e.id));

  // 7. Generate weekly summary (once per week, or if missing)
  let summaryUpdated = false;
  try {
    const summaryData = await generateWeeklySummary(
      docResult.merged,
      newsResult.merged,
      eventResult.merged
    );
    if (summaryData) {
      summaryUpdated = true;
      filesToCommit.push({
        path: "content/weekly-summary.json",
        content: JSON.stringify(summaryData, null, 2) + "\n",
      });
    }
  } catch (err) {
    console.error("[WeeklySummary] Generation failed:", err);
    // Non-fatal — summary generation shouldn't break ingestion
  }

  // 8. Dispatch alerts to paid subscribers for newly added content
  let alertResult: { dispatched: boolean; error?: string } = { dispatched: false };
  if (newlyAddedDocs.length > 0 || newlyAddedNews.length > 0 || newlyAddedEvents.length > 0) {
    try {
      alertResult = await dispatchAlerts(newlyAddedDocs, newlyAddedNews, newlyAddedEvents);
    } catch (err) {
      console.error("Alert dispatch failed:", err);
      alertResult = { dispatched: false, error: String(err) };
    }
  }

  // 9. Always update ingest metadata so the health check knows the pipeline ran
  filesToCommit.push({
    path: "content/ingest-meta.json",
    content: JSON.stringify({
      lastSuccessfulRun: new Date().toISOString(),
      documentsFetched: incomingDocs.length,
      newsAdded: newsResult.added,
      docsAdded: docResult.added,
      eventsAdded: eventResult.added,
    }, null, 2) + "\n",
  });

  // 10. Commit all updated files to GitHub (triggers Vercel redeploy)
  let committed = false;
  console.log(`[Ingest] Results: ${incomingDocs.length} docs fetched (${docResult.added} new), ${allNewsItems.length} news fetched (${newsResult.added} new), ${incomingEvents.length} events fetched (${eventResult.added} new), summary updated: ${summaryUpdated}`);
  if (filesToCommit.length > 0) {
    try {
      const parts: string[] = [];
      if (docResult.added > 0) parts.push(`${docResult.added} docs`);
      if (newsResult.added > 0) parts.push(`${newsResult.added} news`);
      if (eventResult.added > 0) parts.push(`${eventResult.added} events`);
      if (summaryUpdated) parts.push("weekly summary");
      const message = `chore: auto-ingest ${parts.join(", ")}`;

      await commitFiles(filesToCommit, message);
      committed = true;
      console.log(`Committed ${filesToCommit.length} files to GitHub: ${message}`);
    } catch (err) {
      console.error("GitHub commit failed:", err);
      // Non-fatal — content was still fetched and alerts dispatched
    }
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
    alerts: alertResult,
    committed,
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
