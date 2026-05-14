// Render the one-off Disclosure Watch SpecialEventReel for the
// May 8, 2026 Pentagon UAP release.
//
// Usage:
//   node remotion/render-special-event.mjs
//
// Reads the manifest produced by scripts/fetch-uap-release-2026-05-08.mjs
// and renders an ~81s vertical MP4 to ./out/.
//
// All copy in this script is hardcoded from VERIFIED public reporting
// (see citations below). No AI generation here — this is a breaking-news
// reel and we don't want fabrications.
//
// Sources:
//  - https://www.cbsnews.com/news/pentagon-begins-release-ufo-files/
//  - https://www.opb.org/article/2026/05/08/pentagon-ufo-files/
//  - https://www.metabunk.org/threads/war-gov-ufo-department-of-war-releases-uap-files-2026-release-1.14870/

import "./load-env.mjs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(__dirname, "uap-assets");
const ASSET_FOLDER = "uap-2026-05-08";
const MANIFEST_PATH = path.join(ASSET_ROOT, ASSET_FOLDER, "manifest.json");

const main = async () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Manifest missing at ${MANIFEST_PATH}. Run "node scripts/fetch-uap-release-2026-05-08.mjs" first.`
    );
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("Manifest is empty.");
  }
  console.log(`[Special] Loaded ${manifest.length} incidents from manifest.`);

  const incidents = manifest.slice(0, 7).map((m) => ({
    slug: m.slug,
    file: m.file,
    title: m.title,
    location: m.location,
    date: m.date,
    caption: m.caption,
  }));

  const inputProps = {
    hookKicker: "BREAKING · MAY 8, 2026",
    hookTitle: "The Pentagon just dropped its biggest UAP file release.",
    announcement:
      "The Department of War launched war.gov/UFO and posted 162 declassified files from the FBI, DoD, NASA, and State Department.",
    stats: { files: 162, videos: 28, minutes: 41, agencies: 4 },
    incidents,
    caveat:
      "The Pentagon's 2024 report still says it has found no evidence of confirmed alien technology.",
    whatNext:
      "More tranches every few weeks. Rep. Anna Paulina Luna says 46 additional whistleblower videos are still pending.",
    assetFolder: ASSET_FOLDER,
  };

  console.log("[Special] Bundling Remotion project...");
  // publicDir tells Remotion's bundler where staticFile() should resolve to.
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
    publicDir: ASSET_ROOT,
    webpackOverride: (config) => config,
  });

  console.log("[Special] Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "SpecialEventReel",
    inputProps,
  });

  const outDir = path.join(REPO_ROOT, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outputLocation = path.join(outDir, "special-event-uap-2026-05-08.mp4");

  console.log(`[Special] Rendering to ${outputLocation}`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
  });

  console.log(`[Special] Done. Output: ${outputLocation}`);
};

main().catch((err) => {
  console.error("[Special] Render failed:", err);
  process.exit(1);
});
