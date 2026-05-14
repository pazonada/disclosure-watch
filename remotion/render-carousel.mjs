// Render the Disclosure Watch weekly carousel.
//
// Picks ONE anchor topic for the week (either the most substantive new
// document or the most significant news story) and builds a 9-slide
// deep dive around it:
//
//   1. Cover        — big teaser with OG image (news) or typography (doc)
//   2. Anchor card  — full title + source + hero image (news)
//   3. What happened
//   4. Detail 1
//   5. Detail 2
//   6. Detail 3
//   7. Why it matters
//   8. What to watch next
//   9. CTA
//
// For news anchors, fetches the article's OpenGraph image and passes it
// through to Remotion so it can be used as the cover/hero visual.
//
// Usage: node remotion/render-carousel.mjs

import "./load-env.mjs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { fetchOgImage, searchDvidsRecent } from "./lib/multimedia.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TOTAL_SLIDES = 9;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Claude helper ──────────────────────────────────────────────────────────

const callClaude = async (prompt, maxTokens = 1500) => {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set in environment");
  }

  const maxAttempts = 4;
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || "";
    }

    const body = await res.text();
    lastError = `${res.status} ${body}`;
    const shouldRetry = res.status === 429 || res.status >= 500;
    if (!shouldRetry || attempt === maxAttempts) {
      throw new Error(`Claude API failed: ${lastError}`);
    }
    const backoffMs = 1000 * Math.pow(2, attempt - 1);
    console.warn(
      `[Carousel] Claude API ${res.status} (attempt ${attempt}/${maxAttempts}) — retrying in ${backoffMs}ms`
    );
    await sleep(backoffMs);
  }
  throw new Error(`Claude API failed after ${maxAttempts} attempts: ${lastError}`);
};

const parseClaudeJson = (response) => {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
};

const formatShortDate = (isoDate) =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ── Anchor media: OG image for news anchors, DVIDS image for doc anchors ─

const findAnchorImage = async (anchor) => {
  if (anchor.kind === "news" && anchor.pageUrl) {
    console.log(`[Carousel] Trying OG image: ${anchor.pageUrl}`);
    const og = await fetchOgImage(anchor.pageUrl);
    if (og) return og;
  }

  // Doc anchors and news fallback: search DVIDS for related stills.
  // Only attempt this if the anchor's title looks UAP-specific so we
  // don't pull random military photos.
  const title = anchor.title || "";
  if (/(uap|ufo|aaro|whistleblower|disclosure|anomalous)/i.test(title)) {
    console.log(`[Carousel] Trying DVIDS image search for "${title}"`);
    const dvids = await searchDvidsRecent({
      keywords: title.split(/\s+/).slice(0, 6).join(" "),
      type: "image",
      limit: 1,
    });
    if (dvids.length > 0) return dvids[0].mediaUrl;
  }

  return undefined;
};

// ── Pick anchor (doc vs news) and generate deep content ──────────────────

const generateAnchorContent = async ({
  weekOf,
  recentDocs,
  recentNews,
  fallbackDocs,
  fallbackNews,
}) => {
  // Prefer recent items but fall back to broader pool if there's nothing fresh.
  const docsForPick = recentDocs.length > 0 ? recentDocs : fallbackDocs.slice(0, 20);
  const newsForPick = recentNews.length > 0 ? recentNews : fallbackNews.slice(0, 20);

  const docList = docsForPick
    .slice(0, 15)
    .map(
      (d, i) =>
        `DOC[${i}] ${d.category || "?"} | ${d.source} | ${d.publishedDate} | "${d.title}"\n    ${d.expandedSummary || d.summary || ""}${d.keyPoints?.length ? `\n    Key points: ${d.keyPoints.join(" / ")}` : ""}`
    )
    .join("\n\n");

  const newsList = newsForPick
    .slice(0, 15)
    .map(
      (n, i) =>
        `NEWS[${i}] ${n.source} | ${n.publishedDate} | "${n.title}"\n    ${n.description || ""}`
    )
    .join("\n\n");

  const prompt = `You produce a weekly Instagram carousel for Disclosure Watch, which tracks U.S. government UAP / anomalous-phenomena disclosure activity. The audience is a curious, well-informed adult who is NOT a UFO obsessive.

This week, you will pick ONE anchor topic — either a notable document release OR a major news story — and build a 9-slide deep dive on it. Depth beats breadth: we are NOT doing a weekly recap, we are teaching the viewer one thing in detail.

WEEK OF: ${weekOf}

RECENT DOCUMENTS:
${docList || "(none recent)"}

RECENT NEWS:
${newsList || "(none recent)"}

TASK:
Step 1 — Pick the single most substantive, specific, teachable anchor. Criteria:
- Has concrete details (named officials, specific legislation, dated events, real quotes or evidence)
- Is actually news-worthy to someone who does not follow UFO culture
- Favor documents (doc drops) when they have specific provisions / findings
- Favor news stories when they reveal a named action, statement, or development
- AVOID: vague speculation, opinion essays, anything without named sources or concrete facts

Step 2 — Write a full deep-dive payload.

Return JSON with this exact shape:
{
  "kind": "doc" | "news",
  "pickIndex": <the [N] index of your pick, e.g. 3 for DOC[3] or NEWS[3]>,
  "tag": "THE DOC DROP" | "THE STORY" | "THE BILL" | "THE REPORT" | "THE HEARING"   (pick whichever fits best, ALL CAPS, 2-4 words)
  "teaser": "<cover teaser, 6-12 words, punchy, self-contained, NOT a restatement of the title. Something like 'The Pentagon just named its first UAP whistleblower.'>",
  "whatHappened": "<2-3 sentences (40-65 words) explaining what actually happened in plain English. Who did what, when, to whom. No jargon.>",
  "details": [
    "<Detail 1: a concrete, specific fact, provision, finding, or quote. 20-35 words. Lead with the most striking one.>",
    "<Detail 2: another concrete specific. Not a rephrase of detail 1. 20-35 words.>",
    "<Detail 3: another concrete specific. 20-35 words.>"
  ],
  "whyItMatters": "<2-3 sentences (40-70 words) on implications. Why does this matter beyond the headline? What does it change? Who is affected? Avoid generic 'it remains to be seen' filler.>",
  "whatNext": "<1-2 sentences (20-40 words) on what a viewer should watch for next. A specific upcoming vote, deadline, hearing, or open question. If no specific upcoming event, pose the sharpest unanswered question.>"
}

VOICE:
- Informed, accessible, slightly cinematic
- NEVER use em dashes (—). Use commas or restructure.
- No filler phrases ("It remains to be seen", "Notably", "In a significant development", "In an unprecedented move").
- Concrete over abstract. Always prefer names, dates, numbers, specific mechanisms.

Reply with ONLY a valid JSON object. No code fences, no commentary.`;

  const response = await callClaude(prompt, 2500);
  const payload = parseClaudeJson(response);

  // Look up the picked item to get its canonical title / source / date / url.
  const pool = payload.kind === "doc" ? docsForPick : newsForPick;
  const picked = pool[payload.pickIndex];
  if (!picked) {
    throw new Error(
      `Claude returned pickIndex=${payload.pickIndex} for kind=${payload.kind} but the pool only has ${pool.length} items`
    );
  }

  const title =
    payload.kind === "doc" ? picked.title : picked.title;
  const source = picked.source;
  const date = picked.publishedDate
    ? formatShortDate(picked.publishedDate)
    : "";
  const pageUrl =
    payload.kind === "news"
      ? picked.url
      : picked.sourceUrl || picked.documentUrl;

  return {
    anchor: {
      kind: payload.kind,
      tag: payload.tag,
      title,
      source,
      date,
      teaser: payload.teaser,
      whatHappened: payload.whatHappened,
      details: payload.details,
      whyItMatters: payload.whyItMatters,
      whatNext: payload.whatNext,
      pageUrl,
    },
    pickedItem: picked,
  };
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

  const weekDate = new Date(summaryData.weekOf + "T00:00:00");
  const weekOf = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Rolling 7-day window for "recent"
  const cutoff = new Date(weekDate);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recentDocs = docs.filter(
    (d) => (d.addedDate || d.publishedDate) >= cutoffStr
  );
  const recentNews = news.filter(
    (n) => (n.addedDate || n.publishedDate) >= cutoffStr
  );

  console.log(
    `[Carousel] Recent window (last 7 days): ${recentDocs.length} docs, ${recentNews.length} news items`
  );

  console.log("[Carousel] Picking anchor and generating deep-dive content via Claude...");
  const { anchor } = await generateAnchorContent({
    weekOf,
    recentDocs,
    recentNews,
    fallbackDocs: docs,
    fallbackNews: news,
  });

  console.log(`[Carousel] Anchor: ${anchor.kind.toUpperCase()} — "${anchor.title}"`);

  // Find a hero image — OG for news anchors, DVIDS image for UAP-specific docs
  const imageUrl = await findAnchorImage(anchor);
  if (imageUrl) {
    console.log(`[Carousel] Hero image: ${imageUrl}`);
  } else {
    console.log(`[Carousel] No hero image found — typography only`);
  }

  const finalAnchor = {
    kind: anchor.kind,
    tag: anchor.tag,
    title: anchor.title,
    source: anchor.source,
    date: anchor.date,
    teaser: anchor.teaser,
    whatHappened: anchor.whatHappened,
    details: anchor.details,
    whyItMatters: anchor.whyItMatters,
    whatNext: anchor.whatNext,
    imageUrl,
  };

  const baseProps = { weekOf, anchor: finalAnchor };

  console.log("[Carousel] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  const safeDate = weekOf.replace(/[\s,]+/g, "-").toLowerCase();
  const outDir = path.join(__dirname, `../out/carousel-${safeDate}`);
  fs.mkdirSync(outDir, { recursive: true });

  for (const f of fs.readdirSync(outDir)) {
    if (f.startsWith("slide-")) fs.unlinkSync(path.join(outDir, f));
  }

  console.log(`[Carousel] Rendering ${TOTAL_SLIDES} slides to ${outDir}`);

  for (let slideIndex = 0; slideIndex < TOTAL_SLIDES; slideIndex++) {
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

    console.log(`[Carousel] Rendered slide ${slideIndex + 1}/${TOTAL_SLIDES}`);
  }

  console.log("[Carousel] Done! Output:", outDir);
};

main().catch((err) => {
  console.error("[Carousel] Render failed:", err);
  process.exit(1);
});
