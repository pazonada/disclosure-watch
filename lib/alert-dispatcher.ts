/**
 * Shared alert dispatch logic.
 *
 * Called by:
 *   - app/api/alerts/dispatch/route.ts (HTTP endpoint for external triggers)
 *   - app/api/ingest/route.ts          (directly, in-process, for new items)
 *
 * Calling this directly avoids an HTTP round-trip from ingest → dispatch
 * endpoint, which was a silent failure point when NEXT_PUBLIC_SITE_URL
 * was misconfigured or the public domain returned 401 for some reason.
 */

import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import { buildAlertEmailHtml, buildAlertSubject, AlertItem } from "@/lib/alert-email";
import { generateAlertSummary, improveItemSummaries } from "@/lib/ai";

export interface DispatchResult {
  sent: number;
  skipped: number;
  totalSubscribers: number;
  reason?: string;
  error?: string;
}

export async function dispatchAlertsToSubscribers(
  items: AlertItem[]
): Promise<DispatchResult> {
  if (!items || items.length === 0) {
    return { sent: 0, skipped: 0, totalSubscribers: 0, reason: "No items to alert on." };
  }

  const { data: subscribers, error: subError } = await supabase
    .from("subscribers")
    .select(`
      id,
      email,
      tier,
      alert_preferences (
        trigger_documents,
        trigger_hearings,
        trigger_milestones,
        trigger_news,
        keywords,
        frequency
      )
    `)
    .eq("tier", "paid")
    .eq("status", "active");

  if (subError) {
    console.error("[AlertDispatcher] Supabase query failed:", subError);
    return { sent: 0, skipped: 0, totalSubscribers: 0, error: subError.message };
  }

  if (!subscribers || subscribers.length === 0) {
    return { sent: 0, skipped: 0, totalSubscribers: 0, reason: "No paid subscribers." };
  }

  console.log(`[AlertDispatcher] Found ${subscribers.length} paid subscribers. Dispatching ${items.length} items.`);

  const [summary, improvedSummaries] = await Promise.all([
    generateAlertSummary(items),
    improveItemSummaries(items),
  ]);

  improvedSummaries.forEach((betterSummary, idx) => {
    if (idx >= 0 && idx < items.length) {
      items[idx].summary = betterSummary;
    }
  });

  let sent = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefs = (sub as any).alert_preferences?.[0] || {
      trigger_documents: true,
      trigger_hearings: false,
      trigger_milestones: false,
      trigger_news: false,
      keywords: [],
      frequency: "realtime",
    };

    if (prefs.frequency === "daily") {
      skipped++;
      continue;
    }

    const matchingItems = items.filter((item) => {
      const typeMatch =
        (item.type === "document" && prefs.trigger_documents) ||
        (item.type === "event" && prefs.trigger_hearings) ||
        (item.type === "news" && prefs.trigger_news);

      if (!typeMatch) return false;

      const keywords = prefs.keywords || [];
      if (keywords.length > 0) {
        const text = `${item.title} ${item.summary}`.toLowerCase();
        return keywords.some((kw: string) => text.includes(kw.toLowerCase()));
      }

      return true;
    });

    if (matchingItems.length === 0) {
      skipped++;
      continue;
    }

    try {
      await sendEmail({
        to: sub.email,
        subject: buildAlertSubject(matchingItems),
        html: buildAlertEmailHtml(matchingItems, summary).replace(
          "{{email}}",
          encodeURIComponent(sub.email)
        ),
      });
      sent++;
      console.log(`[AlertDispatcher] Sent alert to ${sub.email} (${matchingItems.length} items).`);
    } catch (err) {
      console.error(`[AlertDispatcher] Failed to send alert to ${sub.email}:`, err);
    }
  }

  return { sent, skipped, totalSubscribers: subscribers.length };
}
