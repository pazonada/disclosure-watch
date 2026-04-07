// Render the deep-dive reel using sample props (no API key needed).
// Use this to preview the composition without making API calls.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
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

const main = async () => {
  console.log("[DeepDive Sample] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  console.log("[DeepDive Sample] Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "DeepDiveReel",
    inputProps: SAMPLE_PROPS,
  });

  const outputLocation = path.join(__dirname, "../out/deep-dive-sample.mp4");
  console.log("[DeepDive Sample] Rendering to", outputLocation);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps: SAMPLE_PROPS,
  });

  console.log("[DeepDive Sample] Done! Output:", outputLocation);
};

main().catch((err) => {
  console.error("[DeepDive Sample] Render failed:", err);
  process.exit(1);
});
