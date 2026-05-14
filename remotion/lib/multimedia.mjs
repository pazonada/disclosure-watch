// Shared multimedia helpers for weekly Remotion renders.
//
// Two sources, in priority order:
//   1. OpenGraph / Twitter card image from the article's own URL
//      — works for most mainstream outlets, occasional 403s
//   2. DVIDS public archive (military/government media)
//      — useful when a news item references a specific government video
//      that's been mirrored to DVIDS (e.g. AARO releases, Pentagon clips)
//
// Each helper returns a uniform shape:
//   { kind: 'image' | 'video' | null, url, attribution, sourcePage? }
//
// "kind: null" means nothing usable was found — caller should fall back
// to a typographic / brand-styled card.

import fs from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const SAFE_HEADERS = {
  "user-agent": UA,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

// ── 1. OpenGraph image scrape ────────────────────────────────────────────

const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

export async function fetchOgImage(pageUrl) {
  if (!pageUrl) return null;
  try {
    const res = await fetch(pageUrl, {
      headers: SAFE_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[og] ${res.status} ${pageUrl}`);
      return null;
    }
    const html = await res.text();
    for (const p of OG_PATTERNS) {
      const m = html.match(p);
      if (m && m[1]) {
        try {
          return new URL(m[1], pageUrl).toString();
        } catch {
          return m[1];
        }
      }
    }
    return null;
  } catch (err) {
    console.warn(`[og] error ${pageUrl}: ${err.message}`);
    return null;
  }
}

// ── 2. DVIDS search ──────────────────────────────────────────────────────

/**
 * Search the public DVIDS archive for recent media matching keywords.
 * Returns up to N results ordered by recency, with the page URL and
 * (when scrapable) the direct CloudFront MP4 URL.
 */
export async function searchDvidsRecent({
  keywords,
  type = "video",
  limit = 5,
}) {
  if (!keywords) return [];
  const q = encodeURIComponent(keywords);
  const searchUrl = `https://www.dvidshub.net/search?q=${q}&type=${type}&order=date`;
  let html;
  try {
    const res = await fetch(searchUrl, {
      headers: SAFE_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  // Each result links to /video/<bucket>/<id> or /image/<bucket>/<id>.
  // Pull the first <limit> distinct page paths.
  const re = new RegExp(`/${type}/(\\d+)/(\\d+)`, "g");
  const seen = new Set();
  const pageIds = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    pageIds.push(id);
    if (pageIds.length >= limit) break;
  }

  const results = [];
  for (const id of pageIds) {
    const pageUrl = `https://www.dvidshub.net/${type}/${id}`;
    const meta = await fetchDvidsPageMeta(pageUrl, type);
    if (meta) results.push(meta);
  }
  return results;
}

const CLOUDFRONT_VIDEO = /https?:\/\/[a-z0-9-]+\.cloudfront\.net\/video\/[^"'\s<>]+\.mp4/i;
const CLOUDFRONT_IMAGE = /https?:\/\/[a-z0-9-]+\.cloudfront\.net\/[^"'\s<>]+\.(?:jpg|jpeg|png)/i;

async function fetchDvidsPageMeta(pageUrl, type) {
  try {
    const res = await fetch(pageUrl, { headers: SAFE_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s*\|\s*DVIDS.*$/, "").trim()
      : null;

    const mediaUrlMatch = html.match(
      type === "video" ? CLOUDFRONT_VIDEO : CLOUDFRONT_IMAGE
    );
    const mediaUrl = mediaUrlMatch ? mediaUrlMatch[0] : null;

    if (!mediaUrl) return null;
    return { pageUrl, title, mediaUrl, kind: type };
  } catch {
    return null;
  }
}

// ── 3. Per-news-item resolver ────────────────────────────────────────────

const UAP_DVIDS_KEYWORDS_RE =
  /(uap|ufo|aaro|whistleblower|disclosure hearing|anomalous phenomena)/i;

/**
 * Find a hero image (or video) for a news article. Prefers the article's
 * own OG image. Falls back to a DVIDS recent-search if and only if the
 * article is on a UAP-specific topic (avoids irrelevant matches).
 */
export async function findMediaForNewsArticle(newsItem) {
  const og = await fetchOgImage(newsItem.url);
  if (og) {
    return {
      kind: "image",
      url: og,
      attribution: newsItem.source || null,
      sourcePage: newsItem.url,
    };
  }

  // Fall back to DVIDS only for UAP-specific articles
  if (UAP_DVIDS_KEYWORDS_RE.test(newsItem.title || "")) {
    const dvids = await searchDvidsRecent({
      keywords: newsItem.title,
      type: "video",
      limit: 1,
    });
    if (dvids.length > 0) {
      return {
        kind: "video",
        url: dvids[0].mediaUrl,
        attribution: "DVIDS / U.S. Government",
        sourcePage: dvids[0].pageUrl,
      };
    }
  }

  return { kind: null, url: null, attribution: null, sourcePage: null };
}

// ── 4. Local download helper (for video, where remote streaming is risky) ─

export async function downloadToLocal(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await fetch(url, { headers: SAFE_HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}
