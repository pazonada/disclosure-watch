/**
 * Email templates for Disclosure Watch.
 *
 * All emails use a clean white background with responsive width.
 * Insider alerts include a hero banner to distinguish them from
 * the free weekly briefing.
 */

interface AlertItem {
  title: string;
  type: "document" | "news" | "event";
  url: string;
  summary: string;
  date: string;
}

// ── Shared styles ───────────────────────────────────────────────────────────

const SITE_URL = "https://disclosurewatch.com";
const HERO_IMG = `${SITE_URL}/images/earth-hero.jpg`;

const WRAPPER_STYLE =
  'margin: 0; padding: 0; background: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;';
const CONTAINER_STYLE =
  "max-width: 680px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 8px; overflow: hidden;";
const INNER_STYLE = "padding: 28px 32px 20px;";
const HEADING_COLOR = "#1a1a2e";
const BODY_COLOR = "#4a5568";
const MUTED_COLOR = "#94a3b8";
const LINK_COLOR = "#3b82f6";
const CARD_BG = "#f7f8fa";
const DIVIDER_COLOR = "#e5e7eb";

function typeLabel(type: AlertItem["type"]): string {
  switch (type) {
    case "document":
      return "NEW DOCUMENT";
    case "news":
      return "NEWS";
    case "event":
      return "EVENT";
  }
}

function typeColor(type: AlertItem["type"]): string {
  switch (type) {
    case "document":
      return "#3b82f6";
    case "news":
      return "#0891b2";
    case "event":
      return "#7c3aed";
  }
}

function footerHtml(footerNote: string): string {
  return `
    <div style="border-top: 1px solid ${DIVIDER_COLOR}; padding: 16px 32px; text-align: center;">
      <p style="color: ${MUTED_COLOR}; font-size: 11px; line-height: 1.6; margin: 0;">
        ${footerNote}<br>
        <a href="${SITE_URL}/api/newsletter/unsubscribe?email={{email}}" style="color: ${MUTED_COLOR}; text-decoration: underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="https://ko-fi.com/studiocrux" style="color: ${MUTED_COLOR}; text-decoration: underline;">Support this project</a>
      </p>
    </div>
  `;
}

// ── Insider Alert Email ─────────────────────────────────────────────────────

export function buildAlertEmailHtml(items: AlertItem[]): string {
  const itemsHtml = items
    .slice(0, 10)
    .map((item) => {
      const shortTitle =
        item.title.length > 80 ? item.title.slice(0, 77) + "..." : item.title;
      const summary =
        item.summary.length > 240
          ? item.summary.slice(0, 237) + "..."
          : item.summary;
      return `
        <div style="margin-bottom: 16px; padding: 16px; background: ${CARD_BG}; border-radius: 8px; border-left: 3px solid ${typeColor(item.type)};">
          <div style="font-size: 10px; font-weight: 700; color: ${typeColor(item.type)}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
            ${typeLabel(item.type)}
          </div>
          <a href="${item.url}" style="color: ${HEADING_COLOR}; font-size: 15px; font-weight: 600; text-decoration: none; line-height: 1.4;">
            ${shortTitle}
          </a>
          <p style="color: ${BODY_COLOR}; font-size: 13px; line-height: 1.5; margin: 6px 0 0;">
            ${summary}
          </p>
        </div>
      `;
    })
    .join("");

  const docCount = items.filter((i) => i.type === "document").length;
  const newsCount = items.filter((i) => i.type === "news").length;
  const eventCount = items.filter((i) => i.type === "event").length;
  const parts: string[] = [];
  if (docCount > 0) parts.push(`${docCount} document${docCount > 1 ? "s" : ""}`);
  if (newsCount > 0) parts.push(`${newsCount} news item${newsCount > 1 ? "s" : ""}`);
  if (eventCount > 0) parts.push(`${eventCount} event${eventCount > 1 ? "s" : ""}`);
  const summaryLine = parts.join(", ");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="${WRAPPER_STYLE}">
      <div style="${CONTAINER_STYLE}">

        <!-- Hero banner (Insider only) -->
        <div style="position: relative; height: 120px; background: #0f172a url(${HERO_IMG}) center/cover no-repeat;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.85) 100%);"></div>
          <div style="position: relative; text-align: center; padding-top: 36px;">
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.02em;">
              Disclosure Watch &mdash; Insider Alert
            </h1>
          </div>
        </div>

        <div style="${INNER_STYLE}">
          <p style="color: ${MUTED_COLOR}; font-size: 13px; margin: 0 0 20px; text-align: center;">
            ${summaryLine} just added to the tracker
          </p>

          ${itemsHtml}

          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="${SITE_URL}" style="display: inline-block; background: ${LINK_COLOR}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              View all updates &rarr;
            </a>
          </div>
        </div>

        ${footerHtml("You're receiving this as a Disclosure Watch Insider.")}
      </div>
    </body>
    </html>
  `;
}

export function buildAlertSubject(items: AlertItem[]): string {
  const docCount = items.filter((i) => i.type === "document").length;
  const otherCount = items.length - docCount;

  if (items.length === 1) {
    const label =
      items[0].type === "document"
        ? "doc"
        : items[0].type === "news"
          ? "article"
          : "event";
    return `Disclosure Watch Insider: 1 new ${label}`;
  }

  const parts: string[] = [];
  if (docCount > 0) parts.push(`${docCount} new doc${docCount > 1 ? "s" : ""}`);
  if (otherCount > 0) parts.push(`${otherCount} new update${otherCount > 1 ? "s" : ""}`);

  return `Disclosure Watch Insider: ${parts.join(" + ")}`;
}

// ── Insider Daily Digest Email ───────────────────────────────────────────────

export function buildDailyDigestEmailHtml(items: AlertItem[]): string {
  const itemsHtml = items
    .slice(0, 10)
    .map((item) => {
      const shortTitle =
        item.title.length > 80 ? item.title.slice(0, 77) + "..." : item.title;
      const summary =
        item.summary.length > 240
          ? item.summary.slice(0, 237) + "..."
          : item.summary;
      return `
        <div style="margin-bottom: 16px; padding: 16px; background: ${CARD_BG}; border-radius: 8px; border-left: 3px solid ${typeColor(item.type)};">
          <div style="font-size: 10px; font-weight: 700; color: ${typeColor(item.type)}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
            ${typeLabel(item.type)}
          </div>
          <a href="${item.url}" style="color: ${HEADING_COLOR}; font-size: 15px; font-weight: 600; text-decoration: none; line-height: 1.4;">
            ${shortTitle}
          </a>
          <p style="color: ${BODY_COLOR}; font-size: 13px; line-height: 1.5; margin: 6px 0 0;">
            ${summary}
          </p>
        </div>
      `;
    })
    .join("");

  const docCount = items.filter((i) => i.type === "document").length;
  const newsCount = items.filter((i) => i.type === "news").length;
  const eventCount = items.filter((i) => i.type === "event").length;
  const parts: string[] = [];
  if (docCount > 0) parts.push(`${docCount} document${docCount > 1 ? "s" : ""}`);
  if (newsCount > 0) parts.push(`${newsCount} news item${newsCount > 1 ? "s" : ""}`);
  if (eventCount > 0) parts.push(`${eventCount} event${eventCount > 1 ? "s" : ""}`);
  const summaryLine = parts.join(", ");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="${WRAPPER_STYLE}">
      <div style="${CONTAINER_STYLE}">

        <!-- Solid color header (distinct from real-time hero banner) -->
        <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 28px 32px; text-align: center;">
          <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.6); margin: 0 0 6px;">
            Disclosure Watch Insider
          </p>
          <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 4px;">
            Your Daily Briefing
          </h1>
          <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0;">
            ${today}
          </p>
        </div>

        <div style="${INNER_STYLE}">
          <p style="color: ${MUTED_COLOR}; font-size: 13px; margin: 0 0 20px; text-align: center;">
            ${summaryLine} added in the last 24 hours
          </p>

          ${itemsHtml}

          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="${SITE_URL}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              View all updates &rarr;
            </a>
          </div>
        </div>

        ${footerHtml("You're receiving this as a Disclosure Watch Insider (daily digest).")}
      </div>
    </body>
    </html>
  `;
}

export function buildDailyDigestSubject(items: AlertItem[]): string {
  const total = items.length;
  return `Disclosure Watch Daily Briefing: ${total} new update${total !== 1 ? "s" : ""}`;
}

// ── Free Weekly Digest Email ────────────────────────────────────────────────

export function buildDigestEmailHtml(summary: string, weekOf: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="${WRAPPER_STYLE}">
      <div style="${CONTAINER_STYLE}">

        <!-- Simple text header (free tier — no hero image) -->
        <div style="text-align: center; padding: 28px 32px 0;">
          <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MUTED_COLOR}; margin: 0 0 6px;">
            Disclosure Watch
          </p>
          <h1 style="color: ${HEADING_COLOR}; font-size: 22px; font-weight: 700; margin: 0 0 4px;">
            Weekly Briefing
          </h1>
          <p style="color: ${MUTED_COLOR}; font-size: 13px; margin: 0;">
            Week of ${weekOf}
          </p>
        </div>

        <div style="${INNER_STYLE}">
          <div style="padding: 20px; background: ${CARD_BG}; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: ${BODY_COLOR}; font-size: 15px; line-height: 1.7; margin: 0;">
              ${summary}
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="${SITE_URL}" style="display: inline-block; background: ${LINK_COLOR}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              See the full tracker &rarr;
            </a>
          </div>

          <div style="text-align: center; margin: 12px 0 0;">
            <p style="color: ${MUTED_COLOR}; font-size: 12px; margin: 0;">
              Want real-time alerts? <a href="${SITE_URL}/subscribe" style="color: ${LINK_COLOR}; text-decoration: underline; font-weight: 500;">Become an Insider</a>
            </p>
          </div>
        </div>

        ${footerHtml("You're receiving this because you subscribed to Disclosure Watch.")}
      </div>
    </body>
    </html>
  `;
}

// ── Verification Code Email ─────────────────────────────────────────────────

export function buildVerificationEmailHtml(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="${WRAPPER_STYLE}">
      <div style="${CONTAINER_STYLE}">

        <div style="text-align: center; padding: 28px 32px 0;">
          <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${MUTED_COLOR}; margin: 0 0 6px;">
            Disclosure Watch
          </p>
          <h1 style="color: ${HEADING_COLOR}; font-size: 20px; font-weight: 700; margin: 0;">
            Verification Code
          </h1>
        </div>

        <div style="${INNER_STYLE}">
          <div style="padding: 24px; background: ${CARD_BG}; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <p style="color: ${BODY_COLOR}; font-size: 14px; margin: 0 0 14px;">
              Enter this code to access your Insider alert settings:
            </p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 0.2em; color: ${HEADING_COLOR}; font-family: monospace;">
              ${code}
            </div>
            <p style="color: ${MUTED_COLOR}; font-size: 12px; margin: 14px 0 0;">
              This code expires in 10 minutes.
            </p>
          </div>
        </div>

        <div style="border-top: 1px solid ${DIVIDER_COLOR}; padding: 16px 32px; text-align: center;">
          <p style="color: ${MUTED_COLOR}; font-size: 11px; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export type { AlertItem };
