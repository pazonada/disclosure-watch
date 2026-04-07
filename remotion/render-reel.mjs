// Render the Disclosure Watch weekly reel as MP4.
//
// Usage: node remotion/render-reel.mjs
//
// Fetches the current weekly summary + top news from the live site
// and renders a 25-second vertical (1080x1920) MP4 reel to ./out/

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";

const fetchInputProps = async () => {
  console.log("[Reel] Fetching live content from", SITE_URL);

  const [summaryRes, newsRes] = await Promise.all([
    fetch(`${SITE_URL}/api/weekly-summary`),
    fetch(`${SITE_URL}/api/news`),
  ]);

  const summaryData = await summaryRes.json();
  const news = await newsRes.json();

  // Format weekOf as "Month D, YYYY" in local time
  const weekDate = new Date(summaryData.weekOf + "T00:00:00");
  const weekOf = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Take top 3 headlines, tag the first as TOP STORY
  const topThree = news.slice(0, 3).map((item, i) => ({
    tag: i === 0 ? "TOP STORY" : i === 1 ? "TRENDING" : "NEW",
    title: item.title,
    source: item.source,
    date: new Date(item.publishedDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return {
    weekOf,
    summary: summaryData.summary,
    headlines: topThree,
  };
};

const main = async () => {
  console.log("[Reel] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  const inputProps = await fetchInputProps();
  console.log("[Reel] Input props:", JSON.stringify(inputProps, null, 2));

  console.log("[Reel] Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "WeeklyReel",
    inputProps,
  });

  // Output filename includes the weekOf date
  const safeDate = inputProps.weekOf.replace(/[\s,]+/g, "-").toLowerCase();
  const outputLocation = path.join(__dirname, `../out/weekly-reel-${safeDate}.mp4`);

  console.log("[Reel] Rendering to", outputLocation);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
  });

  console.log("[Reel] Done! Output:", outputLocation);
};

main().catch((err) => {
  console.error("[Reel] Render failed:", err);
  process.exit(1);
});
