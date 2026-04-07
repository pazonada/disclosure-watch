// Render the carousel POC using sample props (no API key needed).
// Use this to preview the new carousel structure without making API calls.

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_PROPS = {
  weekOf: "April 6, 2026",
  insights: [
    "VP JD Vance is now the highest-ranking U.S. official publicly demanding access to UFO files.",
    "New nuclear fuel signatures linked to 3I/ATLAS reframe the object as a possible engineered artifact.",
    "Congress's June UAP briefing deadline is forcing federal agencies to commit on the record.",
  ],
  stats: { newDocs: 8, newNews: 12, newEvents: 1 },
  noteworthyDoc: {
    title: "AARO Quarterly UAP Report — Q1 2026",
    source: "AARO",
    category: "Report",
    whyItMatters:
      "First quarterly report under the new disclosure mandate. Includes 47 newly catalogued cases and the agency's first acknowledgment of recurring patterns in commercial pilot reports.",
  },
  watchList: [
    {
      headline: "Vance says he's 'obsessed' with UFO files, calls aliens 'demons'",
      source: "NewsNation",
      whyItMatters:
        "First time a sitting VP has publicly framed UAP as a theological issue, signaling how the disclosure debate may polarize.",
    },
    {
      headline: "Latest 3I/ATLAS mystery: Signs of nuclear fuel",
      source: "NewsNation",
      whyItMatters:
        "If confirmed, would be the first non-terrestrial object showing material evidence of artificial propulsion.",
    },
  ],
};

const main = async () => {
  console.log("[Carousel Sample] Bundling...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  // 1 cover + 3 insights + 1 stats + 1 noteworthy + 2 watch + 1 CTA = 9 slides
  const totalSlides = 9;
  const outDir = path.join(__dirname, "../out/carousel-sample");
  fs.mkdirSync(outDir, { recursive: true });

  // Clear old slides
  for (const f of fs.readdirSync(outDir)) {
    if (f.startsWith("slide-")) fs.unlinkSync(path.join(outDir, f));
  }

  console.log(`[Carousel Sample] Rendering ${totalSlides} slides to ${outDir}`);

  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
    const inputProps = { ...SAMPLE_PROPS, slideIndex };

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "WeeklyHighlightsCarousel",
      inputProps,
    });

    const outputLocation = path.join(
      outDir,
      `slide-${String(slideIndex + 1).padStart(2, "0")}.png`
    );

    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: outputLocation,
      inputProps,
    });

    console.log(`[Carousel Sample] Rendered slide ${slideIndex + 1}/${totalSlides}`);
  }

  console.log("[Carousel Sample] Done! Output:", outDir);
};

main().catch((err) => {
  console.error("[Carousel Sample] Render failed:", err);
  process.exit(1);
});
