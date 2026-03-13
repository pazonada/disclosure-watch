/**
 * Builds the HTML for alert emails sent when new content is ingested.
 */

interface AlertItem {
  title: string;
  type: "document" | "news" | "event";
  url: string;
  summary: string;
  date: string;
}

function typeLabel(type: AlertItem["type"]): string {
  switch (type) {
    case "document": return "📄 New Document";
    case "news": return "📰 News";
    case "event": return "📅 Event";
  }
}

function typeColor(type: AlertItem["type"]): string {
  switch (type) {
    case "document": return "#3b82f6";
    case "news": return "#22d3ee";
    case "event": return "#a78bfa";
  }
}

export function buildAlertEmailHtml(items: AlertItem[]): string {
  const itemsHtml = items
    .slice(0, 10) // Cap at 10 items per email
    .map(
      (item) => `
      <div style="margin-bottom: 20px; padding: 16px; background: #1e293b; border-radius: 8px; border-left: 3px solid ${typeColor(item.type)};">
        <div style="font-size: 11px; font-weight: 600; color: ${typeColor(item.type)}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
          ${typeLabel(item.type)}
        </div>
        <a href="${item.url}" style="color: #f1f5f9; font-size: 16px; font-weight: 600; text-decoration: none; line-height: 1.3;">
          ${item.title}
        </a>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 8px 0 0;">
          ${item.summary.slice(0, 200)}${item.summary.length > 200 ? "..." : ""}
        </p>
      </div>
    `
    )
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
    <body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 28px;">🛸</span>
          <h1 style="color: #f1f5f9; font-size: 20px; margin: 8px 0 4px;">Disclosure Watch — Insider Alert</h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">
            ${summaryLine} just added to the tracker
          </p>
        </div>

        <!-- Items -->
        ${itemsHtml}

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://disclosurewatch.com" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View all updates on Disclosure Watch →
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="color: #475569; font-size: 11px; line-height: 1.5; margin: 0;">
            You're receiving this as a Disclosure Watch Insider.<br>
            <a href="https://disclosurewatch.com/api/newsletter/unsubscribe?email={{email}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="https://ko-fi.com/studiocrux" style="color: #64748b; text-decoration: underline;">Support this project</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildAlertSubject(items: AlertItem[]): string {
  if (items.length === 1) {
    return `🛸 ${items[0].title}`;
  }

  const docCount = items.filter((i) => i.type === "document").length;
  if (docCount > 0) {
    return `🛸 ${docCount} new document${docCount > 1 ? "s" : ""} + ${items.length - docCount} more updates`;
  }

  return `🛸 ${items.length} new updates on Disclosure Watch`;
}

/** Builds the HTML for the weekly digest email. */
export function buildDigestEmailHtml(summary: string, weekOf: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 28px;">🛸</span>
          <h1 style="color: #f1f5f9; font-size: 20px; margin: 8px 0 4px;">Disclosure Watch — Weekly Digest</h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">
            Week of ${weekOf}
          </p>
        </div>

        <!-- Summary -->
        <div style="padding: 20px; background: #1e293b; border-radius: 8px; margin-bottom: 24px;">
          <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">
            ${summary}
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://disclosurewatch.com" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            See the full tracker →
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="color: #475569; font-size: 11px; line-height: 1.5; margin: 0;">
            You're receiving this because you subscribed to Disclosure Watch.<br>
            <a href="https://disclosurewatch.com/api/newsletter/unsubscribe?email={{email}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="https://ko-fi.com/studiocrux" style="color: #64748b; text-decoration: underline;">Support this project</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/** Builds the HTML for the email verification code email. */
export function buildVerificationEmailHtml(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">

        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 28px;">🛸</span>
          <h1 style="color: #f1f5f9; font-size: 20px; margin: 8px 0 4px;">Disclosure Watch</h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Your verification code</p>
        </div>

        <div style="padding: 24px; background: #1e293b; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 12px;">Enter this code to access your Insider alert settings:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 0.2em; color: #f1f5f9; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 12px 0 0;">This code expires in 10 minutes.</p>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="color: #475569; font-size: 11px; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export type { AlertItem };
