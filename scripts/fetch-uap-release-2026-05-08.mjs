// Fetch curated UAP videos from the Pentagon's May 8, 2026 release.
//
// The Pentagon mirrored its release to DVIDS (https://www.dvidshub.net),
// which is publicly accessible. We scrape each DVIDS page for the
// JSON-LD `contentUrl` (a CloudFront-hosted MP4) and download to disk.
//
// Usage: node scripts/fetch-uap-release-2026-05-08.mjs
//
// Output: remotion/uap-assets/uap-2026-05-08/{slug}.mp4 + manifest.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "remotion/uap-assets/uap-2026-05-08");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Curated set — variety of locations and timeframes, prioritising clips that
// have distinctive descriptions (not all infrared specks). DVIDS IDs sourced
// from the public release index; titles/captions are verified per-fetch.
const CURATED = [
  {
    slug: "pr28-greece-jan-2024",
    dvidsId: 1006073,
    location: "Greece",
    date: "January 2024",
    caption: "Diamond-shaped object · ~434 knots · short-wave IR only",
  },
  {
    slug: "pr26-uae-oct-2023",
    dvidsId: 1006063,
    location: "United Arab Emirates",
    date: "October 2023",
    caption: "IR sensor track · object moving across the frame",
  },
  {
    slug: "pr22-syria-jul-2022",
    dvidsId: 1006060,
    location: "Syria",
    date: "July 2022",
    caption: "Two orange semi-transparent shapes, two-second appearance",
  },
  {
    slug: "pr23-iraq-dec-2022",
    dvidsId: 1006062,
    location: "Iraq",
    date: "December 2022",
    caption: "IR sensor track · CENTCOM area of operations",
  },
  {
    slug: "pr29-uae-jun-2024",
    dvidsId: 1006074,
    location: "United Arab Emirates",
    date: "June 2024",
    caption: "Recent CENTCOM observation · sensor recording",
  },
  {
    slug: "pr19-mideast-may-2022",
    dvidsId: 1006056,
    location: "Middle East",
    date: "May 2022",
    caption: "Earliest video in the release · CENTCOM",
  },
  {
    slug: "pr21-iraq-may-2022",
    dvidsId: 1006059,
    location: "Iraq",
    date: "May 2022",
    caption: "Multi-sensor tracking · CENTCOM",
  },
];

// ── Utilities ──────────────────────────────────────────────────────────────

const fetchHtml = async (url) => {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.text();
};

const extractContentUrl = (html) => {
  // DVIDS pages embed a CloudFront MP4 URL in the page source. The exact key
  // varies (sometimes inside a JS object, sometimes a JSON-LD blob), so we
  // just grab any *.mp4 URL from the cloudfront video bucket.
  const m = html.match(/https?:\/\/[a-z0-9-]+\.cloudfront\.net\/video\/[^"'\s<>]+\.mp4/);
  return m ? m[0] : null;
};

const extractDuration = (html) => {
  // ISO 8601 duration in JSON-LD: "duration":"PT1M5S"
  const m = html.match(/"duration"\s*:\s*"PT(?:(\d+)M)?(?:(\d+)S)?"/);
  if (!m) return null;
  const min = parseInt(m[1] || "0", 10);
  const sec = parseInt(m[2] || "0", 10);
  return min * 60 + sec;
};

const extractTitle = (html) => {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
  if (og) return og[1];
  const t = html.match(/<title>([^<]+)<\/title>/);
  return t ? t[1].replace(/\s*\|\s*DVIDS.*$/, "").trim() : null;
};

const downloadFile = async (url, dest) => {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const ab = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(ab));
  return ab.byteLength;
};

// ── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = [];
  for (const item of CURATED) {
    const dest = path.join(OUT_DIR, `${item.slug}.mp4`);
    const pageUrl = `https://www.dvidshub.net/video/${item.dvidsId}`;
    process.stdout.write(`[fetch] ${item.slug}  ${pageUrl}\n`);

    let mp4Url, duration, title;
    try {
      const html = await fetchHtml(pageUrl);
      mp4Url = extractContentUrl(html);
      duration = extractDuration(html);
      title = extractTitle(html);
      if (!mp4Url) throw new Error("no contentUrl on page");
    } catch (err) {
      console.warn(`  ! page scrape failed: ${err.message}`);
      continue;
    }

    let bytes = 0;
    if (fs.existsSync(dest)) {
      bytes = fs.statSync(dest).size;
      console.log(`  cached  ${(bytes / 1e6).toFixed(1)} MB`);
    } else {
      try {
        bytes = await downloadFile(mp4Url, dest);
        console.log(`  ok      ${(bytes / 1e6).toFixed(1)} MB`);
      } catch (err) {
        console.warn(`  ! download failed: ${err.message}`);
        continue;
      }
    }

    manifest.push({
      slug: item.slug,
      file: `${item.slug}.mp4`,
      bytes,
      title: title || `${item.location}, ${item.date}`,
      location: item.location,
      date: item.date,
      caption: item.caption,
      durationSeconds: duration || null,
      sourcePageUrl: pageUrl,
      sourceMp4Url: mp4Url,
    });
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n[fetch] wrote ${manifest.length} entries to ${MANIFEST_PATH}`);
};

main().catch((err) => {
  console.error("[fetch] failed:", err);
  process.exit(1);
});
