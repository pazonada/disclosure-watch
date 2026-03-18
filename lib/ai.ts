/**
 * Shared AI utilities for Disclosure Watch.
 *
 * Uses Anthropic's Claude API (Haiku model) for lightweight text generation.
 * All functions return "" on failure so callers can gracefully degrade.
 */

import type { AlertItem } from "./alert-email";

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
