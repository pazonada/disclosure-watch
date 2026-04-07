// Debug: render still frames at key timestamps to verify scene transitions
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_PROPS = {
  documentTitle: "H.R. 5060: UAP Whistleblower Protection Act",
  source: "Congress",
  publishedDate: "September 15, 2025",
  category: "Report",
  hook: "This week, Congress quietly introduced sweeping new protections for UAP whistleblowers.",
  whatItIs:
    "Bipartisan legislation introduced by Reps. Burchett and Luna to codify federal protections for individuals disclosing UAP-related information.",
  keyPoints: [
    "Establishes legal shield for federal employees disclosing UAP information",
    "Creates secure reporting channels through AARO and the IC IG",
    "Mandates retaliation reviews within 60 days",
  ],
  whyItMatters:
    "It's the first standalone whistleblower bill since the 2023 disclosure hearings, signaling Congress is moving from rhetoric to enforcement.",
  newsContext:
    "The Debrief called it 'the first serious legislative attempt to give UAP insiders a way out,' while NewsNation noted Burchett's promise to push for floor votes before the August recess.",
};

// Frame timestamps for each scene midpoint
const FRAMES = [
  { frame: 60, label: "01-hook" },          // Hook scene (0-120)
  { frame: 195, label: "02-document" },     // Document scene (120-270)
  { frame: 345, label: "03-whatitis" },     // What it is (270-420)
  { frame: 510, label: "04-keypoints" },    // Key points (420-600)
  { frame: 675, label: "05-news" },         // News context (600-750)
  { frame: 825, label: "06-whymatters" },   // Why it matters (750-900)
  { frame: 975, label: "07-closing" },      // Closing (900-1050)
];

const main = async () => {
  console.log("[Debug] Bundling...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "DeepDiveReel",
    inputProps: SAMPLE_PROPS,
  });

  console.log(`[Debug] Composition: ${composition.durationInFrames} frames @ ${composition.fps}fps`);

  for (const { frame, label } of FRAMES) {
    const output = path.join(__dirname, `../out/debug-frame-${label}.png`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output,
      inputProps: SAMPLE_PROPS,
      frame,
    });
    console.log(`[Debug] Rendered frame ${frame} → ${label}`);
  }
};

main().catch((err) => {
  console.error("[Debug] Failed:", err);
  process.exit(1);
});
