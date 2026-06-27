// Render the Disclosure Watch weekly reel as a long-form vertical MP4.
//
// Pipeline:
//   1. Fetch news + weekly summary from the live site
//   2. Ask Claude to pick the 4 most significant stories and write
//      the per-card text (headline + 1-sentence summary) plus the
//      hook/takeaway/whatNext framing.
//   3. For each card, try to find a hero image (OG scrape) or a
//      relevant DVIDS video; download it locally so Remotion can
//      reference via staticFile().
//   4. Bundle and render. Output: ~54 s, 1080x1920.
//
// Usage: node remotion/render-reel.mjs
//
// Output: ./out/weekly-reel-{date}.mp4

import "./load-env.mjs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  findMediaForNewsArticle,
  downloadToLocal,
  closeStealthBrowser,
} from "./lib/multimedia.mjs";
import { fetchWithRetry } from "./lib/fetch-retry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(__dirname, "uap-assets");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Claude helper ──────────────────────────────────────────────────────────

const callClaude = async (prompt, maxTokens = 1500) => {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set in environment");
  }
  // fetchWithRetry handles both HTTP 429/5xx and network-level errors
  // (ECONNRESET, DNS, etc.) — the latter is what killed the May 18 run.
  const res = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
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
    },
    { logPrefix: "Reel/Claude" }
  );
  if (res.ok) {
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }
  const body = await res.text();
  throw new Error(`Claude API failed: ${res.status} ${body}`);
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

// ── Claude: pick 4 stories + write framing copy ────────────────────────────

const generateReelPayload = async ({ weekOf, weeklySummary, newsPool }) => {
  const list = newsPool
    .slice(0, 25)
    .map(
      (n, i) =>
        `[${i}] ${n.source} | ${n.publishedDate} | "${n.title}" — ${n.description?.slice(0, 300) || ""}`
    )
    .join("\n");

  const prompt = `You produce the weekly Disclosure Watch Instagram Reel (long-form, ~55 seconds). The audience is a curious, well-informed adult. They do NOT follow UFO content, but they care what the U.S. government is doing on UAP / anomalous phenomena.

This week's draft summary (for context, NOT to quote verbatim):
${weeklySummary}

RECENT NEWS (most recent first):
${list}

TASK: Return JSON with the framing copy and the 4 picked stories.

{
  "hookKicker": "<6-10 words, ALL CAPS, mood-setting kicker for the opening hook. e.g. 'THIS WEEK · UAP DISCLOSURE BEAT' or 'THE WEEK CONGRESS BLINKED'. Tied to this week's actual content.>",
  "hookTitle": "<10-16 words, sentence case, the opening title. Punchy, specific, NOT generic. Should hint at the through-line of the week.>",
  "weeklyTakeaway": "<2 sentences (35-55 words) that summarize the week's big picture in plain English. Lead with the most important shift; back it with a concrete data point or named actor. NOT a restatement of headlines.>",
  "newsCards": [
    {
      "index": <integer index from the news list above>,
      "tag": "<TOP STORY | CONGRESS | PENTAGON | WATCH THIS | NEW | TRENDING — pick what fits, ALL CAPS, max 12 chars>",
      "headline": "<edited headline, max 12 words, self-contained, fix typos / vague pronouns>",
      "summary": "<ONE plain-English sentence (18-28 words) that tells the viewer what actually happened and why it's notable. NOT a restated headline. Add the specific detail, name, or number that makes this story matter.>"
    }
    // exactly 4 cards
  ],
  "whatNext": "<1-2 sentences (20-35 words). The single most important thing to watch in the next 1-2 weeks: a deadline, hearing, scheduled release, or open question. Be specific.>"
}

RULES:
- Diversify the 4 cards — don't pick 3 stories about the same event.
- Prefer stories with new, concrete information (legislation introduced, named officials, specific evidence) over speculation/opinion.
- Use the FIRST card for the most significant story; tag = TOP STORY.
- NEVER use em dashes (—). Use commas or rewrite.
- No filler ("It remains to be seen", "In a significant development").
- Be specific (names, dates, agencies) over abstract.

Reply with ONLY the JSON object. No code fences, no commentary.`;

  const response = await callClaude(prompt, 2000);
  const payload = parseClaudeJson(response);

  // Look up canonical news items from the pool by index
  const newsCards = payload.newsCards.map((p) => {
    const src = newsPool[p.index] || {};
    return {
      tag: p.tag,
      headline: p.headline,
      summary: p.summary,
      source: src.source || "Unknown",
      date: src.publishedDate ? formatShortDate(src.publishedDate) : "",
      url: src.url || "",
    };
  });

  return {
    hookKicker: payload.hookKicker,
    hookTitle: payload.hookTitle,
    weeklyTakeaway: payload.weeklyTakeaway,
    whatNext: payload.whatNext,
    newsCards,
  };
};

// ── Per-card media: scrape, download, return local filename ────────────────

const guessExtension = (url, kind) => {
  if (kind === "video") return ".mp4";
  // Image: try to keep original extension if URL has one
  const m = url.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  return m ? `.${m[1].toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
};

const fetchAllMedia = async (cards, assetDir) => {
  fs.mkdirSync(assetDir, { recursive: true });
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card.url) {
      console.log(`[Reel] card ${i + 1}: no URL, skipping media`);
      card.mediaFile = null;
      card.mediaKind = null;
      card.mediaAttribution = null;
      continue;
    }

    const media = await findMediaForNewsArticle({
      url: card.url,
      title: card.headline,
      source: card.source,
    });

    if (!media.kind || !media.url) {
      console.log(`[Reel] card ${i + 1}: no media found for ${card.source}`);
      card.mediaFile = null;
      card.mediaKind = null;
      card.mediaAttribution = null;
      continue;
    }

    const ext = guessExtension(media.url, media.kind);
    const file = `card-${i + 1}-${media.kind}${ext}`;
    const dest = path.join(assetDir, file);

    try {
      const bytes = await downloadToLocal(media.url, dest);
      console.log(
        `[Reel] card ${i + 1}: ${media.kind} ${(bytes / 1e6).toFixed(2)} MB → ${file}`
      );
      card.mediaFile = file;
      card.mediaKind = media.kind;
      card.mediaAttribution = media.attribution;
    } catch (err) {
      console.warn(`[Reel] card ${i + 1}: download failed: ${err.message}`);
      card.mediaFile = null;
      card.mediaKind = null;
      card.mediaAttribution = null;
    }
  }
};

// ── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("[Reel] Fetching live content from", SITE_URL);
  const [summaryRes, newsRes] = await Promise.all([
    fetchWithRetry(`${SITE_URL}/api/weekly-summary`, {}, { logPrefix: "Reel/site" }),
    fetchWithRetry(`${SITE_URL}/api/news`, {}, { logPrefix: "Reel/site" }),
  ]);
  const summaryData = await summaryRes.json();
  const news = await newsRes.json();

  const weekDate = new Date(summaryData.weekOf + "T00:00:00");
  const weekOf = weekDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const safeDate = weekOf.replace(/[\s,]+/g, "-").toLowerCase();
  const assetFolder = `weekly-${safeDate}`;
  const assetDir = path.join(ASSET_ROOT, assetFolder);

  console.log(
    `[Reel] Picking 4 most significant stories from ${news.length} news items via Claude...`
  );
  const payload = await generateReelPayload({
    weekOf,
    weeklySummary: summaryData.summary,
    newsPool: news,
  });

  console.log("[Reel] Fetching per-card multimedia...");
  await fetchAllMedia(payload.newsCards, assetDir);

  // Strip url from props before passing to composition
  const newsCards = payload.newsCards.map(({ url, ...rest }) => rest);

  const inputProps = {
    weekOf,
    hookKicker: payload.hookKicker,
    hookTitle: payload.hookTitle,
    weeklyTakeaway: payload.weeklyTakeaway,
    newsCards,
    whatNext: payload.whatNext,
    assetFolder,
  };

  console.log("[Reel] Input props:");
  console.log(JSON.stringify(inputProps, null, 2));

  console.log("[Reel] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
    publicDir: ASSET_ROOT,
    webpackOverride: (config) => config,
  });

  console.log("[Reel] Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "WeeklyReel",
    inputProps,
  });

  const outputLocation = path.join(REPO_ROOT, `out/weekly-reel-${safeDate}.mp4`);
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

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

main()
  .then(async () => {
    await closeStealthBrowser();
  })
  .catch(async (err) => {
    console.error("[Reel] Render failed:", err);
    await closeStealthBrowser();
    process.exit(1);
  });
