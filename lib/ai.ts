/**
 * Shared AI utilities for Disclosure Watch.
 *
 * Uses Anthropic's Claude API (Haiku model) for lightweight text generation.
 * All functions return "" on failure so callers can gracefully degrade.
 */

import type { AlertItem } from "./alert-email";
import type { NewsItem, UAPEvent, TimelineMilestone } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Low-level Claude call. Returns the generated text, or "" on any failure.
 */
export async function callClaude(
  prompt: string,
  maxTokens = 200
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return "";

    const result = (await response.json()) as any;
    const text = result?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Generate a 2–3 sentence overview paragraph for an Insider Alert email.
 *
 * Summarises the batch of newly-added items at a high level so the
 * subscriber immediately understands what's going on before scanning
 * individual headlines.
 */
export async function generateAlertSummary(
  items: AlertItem[]
): Promise<string> {
  if (items.length === 0) return "";

  const digest = items
    .slice(0, 15)
    .map(
      (item) =>
        `- [${item.type.toUpperCase()}] ${item.title}: ${item.summary.slice(0, 200)}`
    )
    .join("\n");

  const prompt = `You write alert briefings for Disclosure Watch, a site that tracks UAP/UFO government disclosure for a general audience.

TASK: Write 2–3 sentences (max) summarising the significance of the new items below. The reader is a paid subscriber who wants a quick "so what" before scanning the individual headlines. Focus on the big picture: what do these items collectively tell us about the state of disclosure?

VOICE & STYLE:
- Sound like an informed analyst giving a concise briefing – not academic, not clickbait.
- Lean toward straight reporting. State what happened and what it means.
- NEVER use em dashes (—). Use en dashes ( – ) sparingly, or restructure.
- Avoid overused LLM filler: "In a significant development," "It remains to be seen," "Notably," etc.
- No emojis. No exclamation marks unless quoting someone.

New items just added:
${digest}

Write ONLY the 2–3 sentence summary. No intro, no sign-off, no quotes around it.`;

  return callClaude(prompt, 200);
}

/**
 * Generate concise, informative one-line summaries for alert items.
 *
 * Many NARA/archive records have generic boilerplate descriptions like
 * "This item is a Skywatch Incident Report created by the FAA..."
 * This function extracts the key details (location, date, significance)
 * and produces a brief, readable summary for each item.
 *
 * Processes items in a single batch call to minimize API usage.
 * Returns a map of item index → improved summary.
 */
export async function improveItemSummaries(
  items: AlertItem[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  if (items.length === 0) return results;

  // Only improve items with generic/boilerplate summaries
  const boilerplatePatterns = [
    "this item is a skywatch incident report",
    "record from the national archives",
    "this item is a",
  ];

  const itemsToImprove: { index: number; item: AlertItem }[] = [];
  for (let i = 0; i < items.length; i++) {
    const lower = items[i].summary.toLowerCase();
    if (boilerplatePatterns.some((p) => lower.startsWith(p))) {
      itemsToImprove.push({ index: i, item: items[i] });
    }
  }

  if (itemsToImprove.length === 0) return results;

  const itemList = itemsToImprove
    .slice(0, 15)
    .map(
      ({ index, item }) =>
        `[${index}] Title: "${item.title}" | Original: "${item.summary.slice(0, 300)}"`
    )
    .join("\n");

  const prompt = `You rewrite boilerplate document descriptions for Disclosure Watch, a UAP tracking site.

TASK: For each item below, write a single sentence (max 30 words) that extracts the KEY details: what type of report, location, date referenced in the title, and what agency filed it. Make it informative and scannable.

RULES:
- One sentence per item, max 30 words each
- Extract specific details: city/state, date, agency, type of incident
- Format: [index] Your improved summary
- Do NOT repeat the title
- No filler language

Items:
${itemList}

Write ONLY the numbered summaries, one per line.`;

  const response = await callClaude(prompt, 500);
  if (!response) return results;

  // Parse "[index] summary" lines
  for (const line of response.split("\n")) {
    const match = line.match(/^\[(\d+)\]\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const summary = match[2].trim();
      if (summary.length > 10) {
        results.set(idx, summary);
      }
    }
  }

  return results;
}

// ── Upcoming-event extraction from news ─────────────────────────────────────

const EVENT_TYPES = [
  "Hearing",
  "Deadline",
  "Conference",
  "Press Conference",
  "Legislation",
  "Investigation",
  "Agency Update",
  "Advocacy",
  "Document Release",
  "Classified Briefing",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

function stripCodeFence(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

/**
 * Scan recent news for forward-looking UAP-related events (hearings,
 * deadlines, releases, conferences) and return them as UAPEvent[]. Only
 * events with a date in the future (within 18 months) are returned.
 *
 * This is the primary upcoming-events source now that the Congress API
 * hearing endpoint has known limitations (see fetchCongressHearings notes).
 * Costs a single Claude Haiku call per ingest run — pennies per month.
 */
export async function extractUpcomingEventsFromNews(
  newsItems: NewsItem[]
): Promise<UAPEvent[]> {
  if (newsItems.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  // Take the most recent ~40 items — enough to catch forward-looking
  // mentions without blowing prompt budget.
  const sample = [...newsItems]
    .sort(
      (a, b) =>
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime()
    )
    .slice(0, 40);

  const digest = sample
    .map(
      (n, i) =>
        `[${i}] ${n.publishedDate} | ${n.source} | "${n.title}"\n   ${(n.description || "").slice(0, 400)}`
    )
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const eighteenMoOut = new Date(
    Date.now() + 18 * 30 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const prompt = `You extract upcoming UAP-related events from news articles for Disclosure Watch.

TASK: Read the news items below and find any that mention a specific FORWARD-LOOKING date for a UAP/UFO-related hearing, congressional deadline, scheduled document release, conference, press conference, briefing, or vote.

TODAY IS: ${today}. Return ONLY events with dates strictly AFTER today and before ${eighteenMoOut}.

RESPOND WITH VALID JSON — a single array of objects, no prose:
[
  {
    "sourceIndex": <the [N] index from the news list below>,
    "date": "YYYY-MM-DD",
    "title": "<the concrete event, ≤80 chars — NOT the news headline>",
    "type": "<one of: ${EVENT_TYPES.join(" | ")}>",
    "description": "<1 sentence explaining what happens on that date>"
  }
]

RULES:
- If NO news item mentions a specific future date, return: []
- Do NOT invent dates. If a date is vague ("next month", "soon", "later this year"), skip it.
- Do NOT include past events, undated events, or news events (news publication is not an event).
- Prefer official/government dates (hearings, deadlines, releases) over speculative conference dates.
- Max 10 events. Deduplicate obvious repeats.

NEWS ITEMS:
${digest}`;

  const response = await callClaude(prompt, 1500);
  if (!response) return [];

  let parsed: any[];
  try {
    parsed = JSON.parse(stripCodeFence(response));
    if (!Array.isArray(parsed)) return [];
  } catch (err) {
    console.warn("[ai.extractUpcomingEventsFromNews] JSON parse failed:", err);
    return [];
  }

  const todayMs = new Date(today).getTime();
  const cutoffMs = new Date(eighteenMoOut).getTime();
  const events: UAPEvent[] = [];

  for (const item of parsed.slice(0, 10)) {
    const date = String(item?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const dateMs = new Date(date).getTime();
    if (Number.isNaN(dateMs) || dateMs <= todayMs || dateMs > cutoffMs) continue;

    const rawType = String(item?.type || "");
    const type: EventType = (EVENT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as EventType)
      : "Deadline";

    const title = String(item?.title || "").trim().slice(0, 200);
    if (!title) continue;

    const description = String(item?.description || "").trim().slice(0, 500);

    const srcIdx = Number(item?.sourceIndex);
    const src =
      Number.isInteger(srcIdx) && srcIdx >= 0 && srcIdx < sample.length
        ? sample[srcIdx]
        : null;
    const sourceUrl = src?.url || "";

    const idBase = `news-extracted-${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    events.push({
      id: idBase.slice(0, 90),
      title,
      description,
      date,
      type,
      committee: "",
      sourceUrl,
      videoUrl: "",
      transcriptUrl: "",
    });
  }

  return events;
}

// ── Milestone proposal from news ────────────────────────────────────────────

export interface MilestoneProposal {
  date: string;
  title: string;
  description: string;
  importance: "High" | "Medium" | "Low";
  tags: string[];
  sourceUrls: string[];
}

/**
 * Ask Claude to propose new timeline milestones based on the last N weeks of
 * news, avoiding anything already in the milestones list. Returns 0-5
 * candidates. Caller is responsible for surfacing these for human review —
 * this function does NOT commit anything to the milestones file directly.
 */
export async function proposeMilestones(
  recentNews: NewsItem[],
  existingMilestones: TimelineMilestone[],
  weeksBack = 8
): Promise<MilestoneProposal[]> {
  if (recentNews.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const windowed = recentNews
    .filter((n) => n.publishedDate >= cutoffStr)
    .sort(
      (a, b) =>
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime()
    )
    .slice(0, 80);

  if (windowed.length === 0) return [];

  const newsDigest = windowed
    .map(
      (n, i) =>
        `[${i}] ${n.publishedDate} | ${n.source} | "${n.title}" — ${(n.description || "").slice(0, 250)}`
    )
    .join("\n");

  // Give Claude the 20 most-recent existing milestones so it doesn't propose duplicates.
  const existingDigest = [...existingMilestones]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 20)
    .map((m) => `- ${m.date} | ${m.title}`)
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You curate the UAP disclosure timeline for Disclosure Watch. Timeline milestones are BIG, load-bearing events — signed laws, official government reports, landmark hearings, precedent-setting whistleblower testimony, executive orders, major agency policy shifts. NOT everyday news, NOT press conferences, NOT rumors, NOT individual document FOIA releases.

TASK: Review the last ${weeksBack} weeks of news below and propose 0-5 NEW milestones worth adding to the timeline. Prefer quality over quantity — it is ENTIRELY VALID to return [] if nothing rises to the level of a real disclosure milestone.

TODAY IS: ${today}.

EXISTING MILESTONES (do NOT duplicate — anything in this list is already on the timeline):
${existingDigest}

RESPOND WITH VALID JSON — a single array of objects, no prose:
[
  {
    "date": "YYYY-MM-DD",  // when the event actually happened (extract from news)
    "title": "<≤80 char event title, e.g. 'AARO Releases FY2025 Annual Report'>",
    "description": "<1-2 sentences explaining what happened and why it matters>",
    "importance": "High" | "Medium" | "Low",
    "tags": ["<3-5 short tags, e.g. 'AARO', 'FY2025', 'Statutory'>"],
    "sourceNewsIndexes": [<indexes from the NEWS list below that support this milestone>]
  }
]

RULES:
- Every milestone must trace to at least one news item — return that item's [N] index in sourceNewsIndexes.
- Date is the event date, NOT the news publication date.
- "High" = signed law, major executive order, landmark hearing, government-wide policy shift.
- "Medium" = notable congressional action, official report, agency policy update.
- "Low" = supporting events (rarely used — usually skip these).
- If you're not sure it's milestone-worthy, LEAVE IT OUT. This appears on a public timeline.

NEWS:
${newsDigest}`;

  const response = await callClaude(prompt, 2000);
  if (!response) return [];

  let parsed: any[];
  try {
    parsed = JSON.parse(stripCodeFence(response));
    if (!Array.isArray(parsed)) return [];
  } catch (err) {
    console.warn("[ai.proposeMilestones] JSON parse failed:", err);
    return [];
  }

  const seenTitles = new Set(
    existingMilestones.map((m) => m.title.toLowerCase().slice(0, 60))
  );
  const validImportance = new Set(["High", "Medium", "Low"]);
  const out: MilestoneProposal[] = [];

  for (const item of parsed.slice(0, 5)) {
    const date = String(item?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (Number.isNaN(new Date(date).getTime())) continue;

    const title = String(item?.title || "").trim().slice(0, 200);
    if (!title || seenTitles.has(title.toLowerCase().slice(0, 60))) continue;
    seenTitles.add(title.toLowerCase().slice(0, 60));

    const description = String(item?.description || "").trim().slice(0, 600);
    const rawImp = String(item?.importance || "Medium");
    const importance = validImportance.has(rawImp)
      ? (rawImp as MilestoneProposal["importance"])
      : "Medium";

    const rawTags = Array.isArray(item?.tags) ? item.tags : [];
    const tags = rawTags
      .filter((t: unknown) => typeof t === "string")
      .map((t: string) => t.trim())
      .filter(Boolean)
      .slice(0, 6);

    const rawIdxs = Array.isArray(item?.sourceNewsIndexes)
      ? item.sourceNewsIndexes
      : [];
    const sourceUrls = rawIdxs
      .map((i: unknown) => Number(i))
      .filter((i: number) => Number.isInteger(i) && i >= 0 && i < windowed.length)
      .map((i: number) => windowed[i].url)
      .filter(Boolean)
      .slice(0, 4);

    out.push({ date, title, description, importance, tags, sourceUrls });
  }

  return out;
}
