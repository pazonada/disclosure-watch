// AARO (aaro.mil) scraper.
//
// Runs in GitHub Actions on a GitHub-hosted runner (Linux + Azure IP). Uses
// headless Chromium via Playwright to defeat the Akamai TLS-fingerprint + JS
// challenge that blocks plain `fetch()` from Vercel. Scrapes the AARO Cases
// and Reports pages, merges any new entries into content/documents.json,
// and writes the file back. The GitHub Actions workflow then detects the
// diff and commits if anything changed.
//
// Safety:
//   - Per-run cap of MAX_NEW_PER_RUN entries (~50) — if the scraper picks
//     up more than that, it likely means AARO's DOM changed and the
//     selector is over-matching; bail without writing.
//   - Each entry validated for required fields before being written.
//   - Dedup by sourceUrl against existing documents.json.
//   - No deletions — only adds.
//
// Usage:
//   node scripts/scrape-aaro.mjs           # write changes
//   node scripts/scrape-aaro.mjs --dry-run # report only, no write

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_PATH = path.join(REPO_ROOT, "content", "documents.json");
const DRY_RUN = process.argv.includes("--dry-run");

const MAX_NEW_PER_RUN = 50;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const TARGETS = [
  {
    url: "https://www.aaro.mil/Resources/Cases/",
    category: "FOIA Release",
    importance: "Medium",
    titlePrefix: "AARO Case",
    tagBase: ["AARO", "Case Resolution", "Primary Source"],
  },
  {
    url: "https://www.aaro.mil/Resources/Reports/",
    category: "Report",
    importance: "High",
    titlePrefix: "AARO Report",
    tagBase: ["AARO", "Report", "Primary Source"],
  },
];

function toKebab(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * For a single target URL: load it, find every link that looks like a
 * case/report entry, and return one entry object per link.
 *
 * AARO uses Open Publishing CMS, which renders entries inside the page's
 * main content as <a> tags with a heading or filename as visible text.
 * Rather than guess the exact selector (and risk it changing), we cast a
 * wide net: every <a href> inside <main> whose URL points into
 * /Portals/ (where AARO hosts PDFs) or /Resources/ (where each case has
 * its own deep page).
 */
async function scrapeTarget(page, target) {
  console.log(`[AARO] Loading ${target.url}`);
  await page.goto(target.url, { waitUntil: "networkidle", timeout: 60_000 });

  // Wait an extra moment for any deferred JS-rendered content.
  await page.waitForTimeout(2_000);

  const diagnostic = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const allAnchors = Array.from(document.querySelectorAll("a[href]"));
    const mainAnchors = Array.from(main.querySelectorAll("a[href]"));
    return {
      totalAnchorsOnPage: allAnchors.length,
      anchorsInMain: mainAnchors.length,
      pageTitle: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || null,
      firstSixMainHrefs: mainAnchors.slice(0, 6).map((a) => ({
        href: /** @type {HTMLAnchorElement} */ (a).href,
        text: (a.textContent || "").trim().slice(0, 80),
      })),
    };
  });
  console.log(
    `[AARO] DIAGNOSTIC: title="${diagnostic.pageTitle}" h1="${diagnostic.h1}" anchors total=${diagnostic.totalAnchorsOnPage} in-main=${diagnostic.anchorsInMain}`
  );
  for (const a of diagnostic.firstSixMainHrefs) {
    console.log(`  [AARO]   sample: ${a.href} | ${a.text}`);
  }

  const rawLinks = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const anchors = Array.from(main.querySelectorAll("a[href]"));
    return anchors
      .map((a) => ({
        href: /** @type {HTMLAnchorElement} */ (a).href,
        text: (a.textContent || "").trim().replace(/\s+/g, " "),
      }))
      .filter((l) => l.href && l.text);
  });

  // Keep only links that look like AARO documents:
  //   - direct PDFs/files under /Portals/
  //   - case detail pages under /Resources/Cases/<slug>
  //   - report detail pages under /Resources/Reports/<slug>
  const docPattern =
    /https:\/\/(www\.)?aaro\.mil\/(Portals\/[^?#]*\.(pdf|docx|xlsx)|Resources\/Cases\/[^?#]+|Resources\/Reports\/[^?#]+)/i;

  const entries = [];
  const seen = new Set();
  for (const { href, text } of rawLinks) {
    if (!docPattern.test(href)) continue;
    // Skip the index pages themselves.
    if (href.replace(/\/$/, "") === target.url.replace(/\/$/, "")) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const title = text.length > 8 ? text : extractTitleFromUrl(href);
    if (!title || title.length < 4) continue;

    entries.push({
      id: toKebab(`aaro-${title}`.slice(0, 80)),
      title: `${target.titlePrefix}: ${title}`.slice(0, 200),
      source: "AARO",
      sourceUrl: href,
      documentUrl: /\.(pdf|docx|xlsx)$/i.test(href) ? href : undefined,
      summary: `${target.titlePrefix} listed on AARO's public resources page. See linked document for full content.`,
      category: target.category,
      importance: target.importance,
      tags: [...target.tagBase],
      publishedDate: extractDateFromUrlOrTitle(href, title) || todayISO(),
      addedDate: todayISO(),
    });
  }

  console.log(`[AARO] ${target.url} → ${entries.length} candidate entries`);
  return entries;
}

function extractTitleFromUrl(url) {
  const filename = url.split("/").pop() || "";
  return filename
    .replace(/\.[a-z]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function extractDateFromUrlOrTitle(url, title) {
  const hay = `${url} ${title}`;
  const ym = hay.match(/\b(20\d{2})[-/](\d{1,2})\b/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  const y = hay.match(/\b(20\d{2})\b/);
  if (y) return `${y[1]}-01-01`;
  return null;
}

function validateEntry(e) {
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.title === "string" &&
    e.title.length > 0 &&
    typeof e.sourceUrl === "string" &&
    e.sourceUrl.startsWith("https://")
  );
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(DOCS_PATH, "utf8"));
  const existingUrls = new Set(
    existing.map((d) =>
      (d.sourceUrl || "").replace(/\/$/, "").toLowerCase()
    )
  );
  const existingIds = new Set(existing.map((d) => d.id));

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: UA,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let allCandidates = [];
  for (const target of TARGETS) {
    try {
      const entries = await scrapeTarget(page, target);
      allCandidates.push(...entries);
    } catch (err) {
      console.error(`[AARO] Failed on ${target.url}:`, err.message);
    }
  }

  await browser.close();

  const valid = allCandidates.filter(validateEntry);
  const dropped = allCandidates.length - valid.length;
  if (dropped > 0) {
    console.warn(`[AARO] ${dropped} entries failed validation; dropped.`);
  }

  const newEntries = valid.filter((e) => {
    const url = e.sourceUrl.replace(/\/$/, "").toLowerCase();
    return !existingUrls.has(url) && !existingIds.has(e.id);
  });

  console.log(`[AARO] candidates: ${valid.length}, new: ${newEntries.length}`);

  if (newEntries.length === 0) {
    console.log("[AARO] Nothing new — exiting.");
    return;
  }

  if (newEntries.length > MAX_NEW_PER_RUN) {
    console.error(
      `[AARO] SAFETY: ${newEntries.length} new entries exceeds MAX_NEW_PER_RUN=${MAX_NEW_PER_RUN}. ` +
        `Refusing to write — selector likely over-matching after a DOM change on aaro.mil. ` +
        `Investigate first.`
    );
    process.exit(2);
  }

  if (DRY_RUN) {
    console.log("[AARO] DRY RUN — would add:");
    for (const e of newEntries) {
      console.log(
        `  ${e.publishedDate} · ${e.source} · ${e.title.slice(0, 90)}`
      );
    }
    return;
  }

  const merged = [...existing, ...newEntries].sort(
    (a, b) =>
      new Date(b.publishedDate).getTime() -
      new Date(a.publishedDate).getTime()
  );
  fs.writeFileSync(
    DOCS_PATH,
    JSON.stringify(merged, null, 2) + "\n",
    "utf8"
  );
  console.log(`[AARO] Wrote ${newEntries.length} new entries to ${DOCS_PATH}`);
}

main().catch((err) => {
  console.error("[AARO] Fatal:", err);
  process.exit(1);
});
