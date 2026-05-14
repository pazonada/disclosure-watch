/**
 * Local preview for the insider alert email.
 *
 * Reads real FAA Washington Operation Center docs from content/documents.json,
 * runs them through the new grouping pipeline, and writes a static HTML file
 * that can be opened in a browser to verify the layout.
 *
 * Usage: npx tsx scripts/preview-alert-email.ts [outputPath]
 */

import * as fs from "fs";
import * as path from "path";
import { buildAlertEmailHtml, AlertItem } from "../lib/alert-email";
import { groupAlertItems } from "../lib/alert-grouping";

const repoRoot = path.resolve(__dirname, "..");
const docsPath = path.join(repoRoot, "content", "documents.json");
const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "out", "alert-email-preview.html");

async function main() {
  const docs = JSON.parse(fs.readFileSync(docsPath, "utf-8"));

  // Pick FAA WOC UAP-activity docs to mimic the kind of email the user saw
  const faa = docs
    .filter((d: { title: string }) => /UFO-UAP ACTIVITY/i.test(d.title))
    .slice(0, 4);

  // Add one non-FAA doc so we can confirm the regular card still renders
  const nonFaa = docs.find(
    (d: { title: string; type?: string }) => !/UFO-UAP ACTIVITY/i.test(d.title)
  );

  const items: AlertItem[] = [
    ...faa.map((d: any) => ({
      title: d.title,
      type: "document" as const,
      url: d.sourceUrl,
      summary: d.summary || "",
      date: d.publishedDate || d.addedDate,
    })),
  ];

  if (nonFaa) {
    items.push({
      title: nonFaa.title,
      type: "document",
      url: nonFaa.sourceUrl,
      summary: nonFaa.summary || "",
      date: nonFaa.publishedDate || nonFaa.addedDate,
    });
  }

  console.log(`[preview] Rendering ${items.length} items (${faa.length} FAA WOC + ${nonFaa ? 1 : 0} other)`);

  const entries = await groupAlertItems(items);
  console.log(
    `[preview] Grouped into ${entries.length} entries (${entries.filter((e) => e.type === "group").length} groups)`
  );

  const summary =
    "This week's tracker pulls in another batch of FAA UAP cover-sheet logs from the National Archives. Most of the underlying narratives are redacted; what's new is the metadata we can now cluster and surface together.";
  const html = buildAlertEmailHtml(entries, summary).replace(
    "{{email}}",
    encodeURIComponent("preview@example.com")
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`[preview] Wrote ${outPath}`);
}

main().catch((err) => {
  console.error("[preview] Failed:", err);
  process.exit(1);
});
