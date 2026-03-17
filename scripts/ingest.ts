/**
 * UAP Document Ingestion Script
 *
 * Pulls from government APIs and feeds to keep documents.json up to date.
 *
 * Data sources:
 *   1. National Archives Catalog API  — Record Group 615 (UAP Records Collection)
 *   2. Congress.gov API               — UAP-related bills, hearings, amendments
 *   3. AARO website                   — Scrape reports and records pages
 *   4. DOE/NNSA                       — UAP/UFO resources page
 *   5. ODNI reports                   — Annual UAP reports
 *
 * Usage:
 *   npx tsx scripts/ingest.ts              # dry-run — prints new docs found
 *   npx tsx scripts/ingest.ts --write      # merges new docs into documents.json
 *
 * Requirements:
 *   - CONGRESS_API_KEY env var (free: https://api.congress.gov/sign-up/)
 *   - Node 18+ (for native fetch)
 */

import * as fs from "fs";
import * as path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

type DocumentSource = "AARO" | "Archives" | "Congress" | "News" | "Manual";
type DocumentCategory = "Report" | "Hearing" | "FOIA Release" | "Image" | "News";
type Importance = "Critical" | "High" | "Medium" | "Low";

interface UAPDocument {
  id: string;
  title: string;
  source: DocumentSource;
  sourceUrl: string;
  documentUrl?: string;
  summary: string;
  category: DocumentCategory;
  importance: Importance;
  tags: string[];
  publishedDate: string;
  addedDate: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DOCUMENTS_PATH = path.resolve(__dirname, "../content/documents.json");

function loadExisting(): UAPDocument[] {
  const raw = fs.readFileSync(DOCUMENTS_PATH, "utf-8");
  return JSON.parse(raw) as UAPDocument[];
}

function saveDocuments(docs: UAPDocument[]): void {
  // Sort newest first
  docs.sort(
    (a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
  fs.writeFileSync(DOCUMENTS_PATH, JSON.stringify(docs, null, 2) + "\n");
}

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

// ── Source 1: National Archives Catalog API v2 ───────────────────────────────
// Docs: https://catalog.archives.gov/api/v2/api-docs/
// Search for Record Group 615 (UAP Records) and related items

async function fetchNationalArchives(): Promise<UAPDocument[]> {
  const naraKey = process.env.NARA_API_KEY;
  if (!naraKey) {
    console.warn("[Archives] No NARA_API_KEY set. Skipping National Archives.");
    return [];
  }

  const results: UAPDocument[] = [];
  const baseUrl = "https://catalog.archives.gov/api/v2/records/search";
  const queries = [
    "q=UAP+OR+%22unidentified+anomalous+phenomena%22&recordGroupNumber=615&limit=100",
    "q=UAP+OR+UFO+OR+%22unidentified+aerial+phenomena%22&online=true&limit=50",
  ];

  for (const queryParams of queries) {
    try {
      const url = `${baseUrl}?${queryParams}`;
      console.log(`[Archives] Fetching: ${url.slice(0, 100)}...`);
      const resp = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": naraKey,
        },
      });
      if (!resp.ok) {
        console.warn(`[Archives] API returned ${resp.status}`);
        continue;
      }

      const data = (await resp.json()) as any;
      const hits = data?.body?.hits?.hits || [];
      console.log(`[Archives] Found ${hits.length} items`);

      for (const hit of hits) {
        const record = hit?._source?.record;
        if (!record) continue;

        const title = record.title;
        if (!title) continue;

        const naId = record.naId;
        const sourceUrl = naId
          ? `https://catalog.archives.gov/id/${naId}`
          : "";

        // Extract date from v2 fields — try multiple date sources
        const startDate =
          record.coverageStartDate ||
          record.inclusiveStartDate ||
          record.productionDates?.[0];
        let publishedDate = "1900-01-01";
        if (startDate?.logicalDate) {
          publishedDate = startDate.logicalDate.slice(0, 10);
        } else if (startDate?.year) {
          const y = startDate.year;
          const m = String(startDate.month || 1).padStart(2, "0");
          const d = String(startDate.day || 1).padStart(2, "0");
          publishedDate = `${y}-${m}-${d}`;
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
            record.scopeAndContentNote ||
            `Record from the National Archives (NAID: ${naId}).`,
          category: "FOIA Release",
          importance: "Medium",
          tags: ["NARA", "Archives", "Record Group 615"],
          publishedDate,
          addedDate: today(),
        });
      }
    } catch (err) {
      console.error("[Archives] Error:", err);
    }
  }

  return results;
}

// ── Source 2: Congress.gov API ────────────────────────────────────────────────
// Docs: https://github.com/LibraryOfCongress/api.congress.gov
// Search for UAP-related bills and hearings

async function fetchCongressGov(): Promise<UAPDocument[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    console.warn(
      "[Congress] No CONGRESS_API_KEY set. Sign up free at https://api.congress.gov/sign-up/"
    );
    return [];
  }

  const results: UAPDocument[] = [];

  // Search bills with "unidentified anomalous phenomena" or "UAP"
  const queries = [
    "unidentified+anomalous+phenomena",
    "UAP+disclosure",
    "unidentified+flying+objects+disclosure",
  ];

  for (const q of queries) {
    try {
      const url = `https://api.congress.gov/v3/bill?query=${q}&limit=50&api_key=${apiKey}&format=json`;
      console.log(`[Congress] Searching bills: ${q}...`);
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[Congress] API returned ${resp.status}`);
        continue;
      }

      const data = (await resp.json()) as any;
      const bills = data?.bills || [];
      console.log(`[Congress] Found ${bills.length} bills`);

      for (const bill of bills) {
        const title = bill?.title || bill?.shortTitle;
        if (!title) continue;

        const congress = bill?.congress || "";
        const number = bill?.number || "";
        const type = bill?.type || "";
        const sourceUrl =
          bill?.url?.replace("format=json", "").replace(/[?&]$/, "") ||
          `https://www.congress.gov/bill/${congress}th-congress/${type.toLowerCase()}-bill/${number}`;

        const dateStr = bill?.latestAction?.actionDate || bill?.updateDate || "";
        const publishedDate = dateStr ? dateStr.slice(0, 10) : "2024-01-01";

        results.push({
          id: toKebab(`congress-${congress}-${type}-${number}`),
          title: title.length > 200 ? title.slice(0, 197) + "..." : title,
          source: "Congress",
          sourceUrl,
          summary:
            bill?.latestAction?.text ||
            `Congressional bill ${type} ${number} from the ${congress}th Congress.`,
          category: "Report",
          importance:
            title.toLowerCase().includes("disclosure") ? "Critical" : "High",
          tags: ["Congress", "Legislation", `${congress}th Congress`],
          publishedDate,
          addedDate: today(),
        });
      }
    } catch (err) {
      console.error(`[Congress] Error searching "${q}":`, err);
    }
  }

  return results;
}

// ── Source 3: AARO Published Reports ─────────────────────────────────────────
// Known direct PDF/page URLs that can be checked for existence

async function fetchAAROReports(): Promise<UAPDocument[]> {
  const knownReports = [
    {
      title: "FY2024 Consolidated Annual Report on UAP",
      url: "https://media.defense.gov/2024/Nov/14/2003583603/-1/-1/0/FY24-CONSOLIDATED-ANNUAL-REPORT-ON-UAP-508.PDF",
      date: "2024-11-14",
      importance: "Critical" as Importance,
      tags: ["AARO", "Annual Report", "ODNI", "FY2024"],
    },
    {
      title:
        "AARO Historical Record Report Vol. 1: U.S. Government Involvement with UAP (1945–2023)",
      url: "https://media.defense.gov/2024/Mar/08/2003409233/-1/-1/0/DOPSR-CLEARED-508-COMPLIANT-HRRV1-08-MAR-2024-FINAL.PDF",
      date: "2024-03-08",
      importance: "Critical" as Importance,
      tags: ["AARO", "Historical Review", "Volume 1"],
    },
    {
      title: "ODNI Preliminary Assessment: Unidentified Aerial Phenomena (June 2021)",
      url: "https://www.dni.gov/files/ODNI/documents/assessments/Prelimary-Assessment-UAP-20210625.pdf",
      date: "2021-06-25",
      importance: "Critical" as Importance,
      tags: ["ODNI", "Preliminary Assessment", "Landmark"],
    },
  ];

  const results: UAPDocument[] = [];

  for (const report of knownReports) {
    try {
      const resp = await fetch(report.url, { method: "HEAD" });
      if (resp.ok) {
        results.push({
          id: toKebab(report.title),
          title: report.title,
          source: "AARO",
          sourceUrl: report.url,
          documentUrl: report.url,
          summary: `Official government report. Verified available at ${new URL(report.url).hostname}.`,
          category: "Report",
          importance: report.importance,
          tags: report.tags,
          publishedDate: report.date,
          addedDate: today(),
        });
        console.log(`[AARO] ✓ ${report.title}`);
      } else {
        console.log(`[AARO] ✗ ${report.title} (${resp.status})`);
      }
    } catch (err) {
      console.log(`[AARO] ✗ ${report.title} (network error)`);
    }
  }

  return results;
}

// ── Merge Logic ──────────────────────────────────────────────────────────────

function mergeDocuments(
  existing: UAPDocument[],
  incoming: UAPDocument[]
): { merged: UAPDocument[]; newCount: number } {
  const existingIds = new Set(existing.map((d) => d.id));
  // Also deduplicate by sourceUrl to avoid near-duplicates
  const existingUrls = new Set(
    existing.map((d) => d.sourceUrl.replace(/\/$/, "").toLowerCase())
  );

  const newDocs: UAPDocument[] = [];

  for (const doc of incoming) {
    const normalizedUrl = doc.sourceUrl.replace(/\/$/, "").toLowerCase();
    if (!existingIds.has(doc.id) && !existingUrls.has(normalizedUrl)) {
      newDocs.push(doc);
      existingIds.add(doc.id);
      existingUrls.add(normalizedUrl);
    }
  }

  return {
    merged: [...existing, ...newDocs],
    newCount: newDocs.length,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const writeMode = process.argv.includes("--write");
  console.log(`\n🛸 Disclosure Watch — Document Ingestion`);
  console.log(`   Mode: ${writeMode ? "WRITE (will update documents.json)" : "DRY RUN (preview only)"}\n`);

  const existing = loadExisting();
  console.log(`Existing documents: ${existing.length}\n`);

  // Fetch from all sources in parallel
  const [archiveDocs, congressDocs, aaroDocs] = await Promise.all([
    fetchNationalArchives(),
    fetchCongressGov(),
    fetchAAROReports(),
  ]);

  const allIncoming = [...archiveDocs, ...congressDocs, ...aaroDocs];
  console.log(`\nTotal fetched from sources: ${allIncoming.length}`);

  const { merged, newCount } = mergeDocuments(existing, allIncoming);
  console.log(`New documents to add: ${newCount}`);
  console.log(`Total after merge: ${merged.length}\n`);

  if (newCount === 0) {
    console.log("✅ Already up to date. No new documents found.");
    return;
  }

  if (writeMode) {
    saveDocuments(merged);
    console.log(`✅ Wrote ${merged.length} documents to ${DOCUMENTS_PATH}`);
  } else {
    console.log("New documents that would be added:");
    const newIds = new Set(existing.map((d) => d.id));
    for (const doc of merged) {
      if (!newIds.has(doc.id)) {
        console.log(`  + [${doc.source}] ${doc.title} (${doc.publishedDate})`);
      }
    }
    console.log(`\nRun with --write to save these changes.`);
  }
}

main().catch(console.error);
