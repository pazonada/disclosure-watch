// Render the Disclosure Watch weekly highlights carousel.
//
// Uses Claude to generate substantive content:
//  - 3 chunked key insights (rewriting the weekly summary as punchy takeaways)
//  - Stats on this week's additions
//  - The most noteworthy new document with a "why it matters" explanation
//  - 2 key news stories with "why it matters" context
//
// Outputs N PNG slides at 1080x1350 (Instagram carousel format).
//
// Usage: node remotion/render-carousel.mjs

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const callClaude = async (prompt, maxTokens = 800) => {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set in environment");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
};

const parseClaudeJson = (response) => {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
};

// ── Compute weekly stats (rolling 7-day window) ───────────────────────────

const computeStats = (docs, news, events) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return {
    newDocs: docs.filter((d) => (d.addedDate || d.publishedDate) >= cutoffStr).length,
    newNews: news.filter((n) => (n.addedDate || n.publishedDate) >= cutoffStr).length,
    newEvents: events.filter((e) => (e.addedDate || e.date) >= cutoffStr).length,
  };
};

// ── Generate carousel content via Claude ──────────────────────────────────

const generateCarouselContent = async ({
  weekOf,
  weeklySummary,
  recentDocs,
  recentNews,
  stats,
}) => {
  const docList = recentDocs
    .slice(0, 20)
    .map(
      (d, i) =>
        `[${i}] ${d.category} | ${d.source} | ${d.publishedDate} | "${d.title}" — ${d.summary?.slice(0, 200) || ""}`
    )
    .join("\n");

  const newsList = recentNews
    .slice(0, 15)
    .map(
      (n, i) =>
        `[${i}] ${n.source} | ${n.publishedDate} | "${n.title}" — ${n.description?.slice(0, 200) || ""}`
    )
    .join("\n");

  const prompt = `You curate a weekly Instagram carousel for Disclosure Watch, a UAP/UFO disclosure tracking site. The audience is a curious adult, not a UFO obsessive.

CONTEXT:
Week of: ${weekOf}
Stats this week: ${stats.newDocs} new documents, ${stats.newNews} news stories, ${stats.newEvents} events.

WEEKLY SUMMARY (raw, too long for one slide):
${weeklySummary}

RECENT DOCUMENTS (${recentDocs.length} total):
${docList || "(none)"}

RECENT NEWS (${recentNews.length} total):
${newsList || "(none)"}

TASK: Generate substantive carousel content as JSON with these fields:

1. "insights" — An array of EXACTLY 3 standalone single-sentence takeaways from the weekly summary. Each one is a complete punchy thought (max 25 words). Together they cover the 3 most important angles. Each insight should feel like a teaser that makes the reader want to know more. Do NOT just chop the summary into thirds — rewrite each as a sharp insight.

2. "noteworthyDoc" — Pick the SINGLE most interesting/significant document from the list above. Return:
   { "title": "...", "source": "...", "category": "...", "whyItMatters": "..." }
   The whyItMatters field should be 1-2 sentences (max 40 words) explaining specifically why this doc matters more than the others. Be concrete (named individuals, specific provisions, historical context). DO NOT just rephrase the title. Use the index to pick from the list.

3. "watchList" — Pick the 2 most significant news stories. Return an array of objects:
   [{ "headline": "...", "source": "...", "whyItMatters": "..." }, ...]
   Each whyItMatters should be 1 sentence (max 30 words) explaining why this story matters in the bigger picture. Be specific.

VOICE:
- Informed, accessible, slightly cinematic
- NEVER use em dashes (—). Use commas or restructure.
- No filler ("It remains to be seen", "Notably", "In a significant development")
- Be specific (names, dates, numbers, concrete details) over abstract
- Each "whyItMatters" should add information the headline doesn't already convey

Reply with ONLY a valid JSON object with keys "insights", "noteworthyDoc", "watchList". No code fences, no extra text.`;

  const response = await callClaude(prompt, 1500);
  return parseClaudeJson(response);
};

// ── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("[Carousel] Fetching live content from", SITE_URL);
  const [summaryRes, docsRes, newsRes] = await Promise.all([
    fetch(`${SITE_URL}/api/weekly-summary`),
    fetch(`${SITE_URL}/api/documents`),
    fetch(`${SITE_URL}/api/news`),
  ]);
  const summaryData = await summaryRes.json();
  const docs = await docsRes.json();
  const news = await newsRes.json();

  // Format the week date
  const weekDate = new Date(summaryData.weekOf + "T00:00:00");
  const weekOf = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Compute stats from a rolling 7-day window
  const stats = computeStats(docs, news, []);
  console.log("[Carousel] Stats (rolling 7 days):", stats);

  // Filter to docs/news added this week (or last 7 days as fallback)
  const recentCutoff = new Date(weekDate);
  recentCutoff.setDate(recentCutoff.getDate() - 7);
  const cutoffStr = recentCutoff.toISOString().slice(0, 10);
  const recentDocs = docs.filter(
    (d) => (d.addedDate || d.publishedDate) >= cutoffStr
  );
  const recentNews = news.filter(
    (n) => (n.addedDate || n.publishedDate) >= cutoffStr
  );

  console.log(
    `[Carousel] Working with ${recentDocs.length} recent docs, ${recentNews.length} recent news items`
  );

  console.log("[Carousel] Generating substantive content with Claude...");
  const content = await generateCarouselContent({
    weekOf,
    weeklySummary: summaryData.summary,
    recentDocs,
    recentNews,
    stats,
  });

  console.log("[Carousel] Content generated:");
  console.log("  Insights:", content.insights.length);
  console.log("  Noteworthy doc:", content.noteworthyDoc.title);
  console.log("  Watch list:", content.watchList.length, "items");

  const baseProps = {
    weekOf,
    insights: content.insights,
    stats,
    noteworthyDoc: content.noteworthyDoc,
    watchList: content.watchList,
  };

  // Calculate total slide count: cover + 3 insights + stats + noteworthy + watchList + cta
  const totalSlides = 1 + 3 + 1 + 1 + Math.min(content.watchList.length, 2) + 1;
  console.log(`[Carousel] Total slides: ${totalSlides}`);

  console.log("[Carousel] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  const safeDate = weekOf.replace(/[\s,]+/g, "-").toLowerCase();
  const outDir = path.join(__dirname, `../out/carousel-${safeDate}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Clear any old slides from previous runs
  for (const f of fs.readdirSync(outDir)) {
    if (f.startsWith("slide-")) fs.unlinkSync(path.join(outDir, f));
  }

  console.log(`[Carousel] Rendering ${totalSlides} slides to ${outDir}`);

  for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
    const inputProps = { ...baseProps, slideIndex };

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

    console.log(`[Carousel] Rendered slide ${slideIndex + 1}/${totalSlides}`);
  }

  console.log("[Carousel] Done! Output:", outDir);
};

main().catch((err) => {
  console.error("[Carousel] Render failed:", err);
  process.exit(1);
});
