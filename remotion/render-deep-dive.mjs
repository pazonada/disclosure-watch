// Render the Disclosure Watch mid-week deep-dive reel as MP4.
//
// Usage: node remotion/render-deep-dive.mjs
//
// Fetches all docs from the live site, has Claude pick the most
// interesting recent one, generates the deep-dive content for it,
// and renders an animated 30-second reel.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const callClaude = async (prompt, maxTokens = 800) => {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
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

const pickInterestingDoc = async (docs) => {
  // Filter to docs added in the last 14 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = docs.filter((d) => (d.addedDate || d.publishedDate) >= cutoffStr);

  if (recent.length === 0) {
    console.log("[DeepDive] No recent docs in last 14 days, using all docs");
    recent.push(...docs.slice(0, 30));
  }

  const candidateList = recent
    .slice(0, 30)
    .map(
      (d, i) =>
        `[${i}] ${d.category} | ${d.source} | ${d.publishedDate} | "${d.title}" — ${d.summary?.slice(0, 200) || ""}`
    )
    .join("\n");

  const prompt = `You curate a weekly "Deep Dive" segment for Disclosure Watch, a UAP/UFO disclosure tracking site.

TASK: Review the documents below and pick the SINGLE most interesting one for a deep-dive reel. Prioritize:
- Significance (Congressional bills > FOIA releases > routine reports)
- Specificity (named individuals, specific events, concrete provisions)
- Newsworthiness (recent, unusual, or under-reported angles)

Documents:
${candidateList}

Reply with ONLY the index number (e.g., "7") and nothing else.`;

  const response = await callClaude(prompt, 50);
  const match = response.match(/\d+/);
  const index = match ? parseInt(match[0], 10) : 0;
  return recent[index] || recent[0];
};

const findRelevantNews = (doc, news) => {
  // Extract meaningful keywords from doc title and summary
  const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on",
    "at", "by", "with", "from", "this", "that", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "can",
    "act", "bill", "report", "document", "records", "release", "uap", "ufo",
  ]);

  const docText = `${doc.title} ${doc.summary || ""}`.toLowerCase();
  const docWords = new Set(
    docText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );

  // Score each news item by keyword overlap
  const scored = news.map((item) => {
    const text = `${item.title} ${item.description || ""}`.toLowerCase();
    let score = 0;
    for (const word of docWords) {
      if (text.includes(word)) score += 1;
    }
    return { item, score };
  });

  // Take top 5 most relevant
  return scored
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.item);
};

const generateDeepDiveContent = async (doc, relevantNews) => {
  const newsContext =
    relevantNews.length > 0
      ? relevantNews
          .map(
            (n) =>
              `- "${n.title}" (${n.source}, ${n.publishedDate}): ${n.description?.slice(0, 200) || ""}`
          )
          .join("\n")
      : "(No directly relevant news coverage found)";

  const prompt = `You write engaging "Deep Dive" social media reels for Disclosure Watch, a UAP disclosure tracking site. The reader is a curious adult, not a UFO obsessive.

DOCUMENT:
Title: ${doc.title}
Source: ${doc.source}
Category: ${doc.category}
Published: ${doc.publishedDate}
Summary: ${doc.summary}

RELEVANT NEWS COVERAGE:
${newsContext}

TASK: Generate 5 short pieces of content as JSON. Use the news coverage to add narrative texture and quote/paraphrase reporters where relevant.

1. "hook" — One sentence that hooks viewers in the first 2 seconds. Should feel like a tease, not a summary. Max 18 words.

2. "whatItIs" — A clear 1-2 sentence explanation of what the document is. Max 30 words.

3. "keyPoints" — An array of 3 short bullet points with the most important specific details. Each point max 16 words. Be specific (names, numbers, dates, provisions).

4. "newsContext" — One or two sentences weaving in what reporters have said about this. Quote or paraphrase from the news coverage above. Mention the outlet by name (e.g., "The Debrief called it..." or "NewsNation reported that..."). If no relevant coverage exists, write a single sentence like "Major outlets have not yet covered this development." Max 50 words.

5. "whyItMatters" — One sentence explaining the broader significance. Max 25 words.

VOICE: Informed, accessible, slightly cinematic. NEVER use em dashes. No filler ("It remains to be seen", "Notably", etc).

Reply with ONLY a valid JSON object with these 5 keys. No code fences, no extra text.`;

  const response = await callClaude(prompt, 1000);
  // Strip code fences if Claude added them anyway
  const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[DeepDive] Failed to parse Claude JSON:", cleaned);
    throw err;
  }
};

const main = async () => {
  console.log("[DeepDive] Fetching documents and news from", SITE_URL);
  const [docsRes, newsRes] = await Promise.all([
    fetch(`${SITE_URL}/api/documents`),
    fetch(`${SITE_URL}/api/news`),
  ]);
  const docs = await docsRes.json();
  const news = await newsRes.json();

  console.log("[DeepDive] Asking Claude to pick the most interesting doc...");
  const chosen = await pickInterestingDoc(docs);
  console.log("[DeepDive] Chosen:", chosen.title);

  console.log("[DeepDive] Finding relevant news coverage...");
  const relevantNews = findRelevantNews(chosen, news);
  console.log(`[DeepDive] Found ${relevantNews.length} relevant news item(s)`);

  console.log("[DeepDive] Generating deep-dive content with Claude...");
  const content = await generateDeepDiveContent(chosen, relevantNews);

  const inputProps = {
    documentTitle: chosen.title,
    source: chosen.source,
    publishedDate: new Date(chosen.publishedDate + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    ),
    category: chosen.category,
    hook: content.hook,
    whatItIs: content.whatItIs,
    keyPoints: content.keyPoints,
    whyItMatters: content.whyItMatters,
    newsContext: content.newsContext,
  };

  console.log("[DeepDive] Input props:", JSON.stringify(inputProps, null, 2));

  console.log("[DeepDive] Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
  });

  console.log("[DeepDive] Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "DeepDiveReel",
    inputProps,
  });

  const safeName = chosen.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const outputLocation = path.join(__dirname, `../out/deep-dive-${safeName}.mp4`);

  console.log("[DeepDive] Rendering to", outputLocation);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
  });

  console.log("[DeepDive] Done! Output:", outputLocation);
};

main().catch((err) => {
  console.error("[DeepDive] Render failed:", err);
  process.exit(1);
});
