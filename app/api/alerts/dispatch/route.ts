import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import { buildAlertEmailHtml, buildAlertSubject, AlertItem } from "@/lib/alert-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/dispatch
 *
 * Sends alert emails to paid subscribers whose preferences match
 * the incoming items. Called by the ingestion pipeline after new
 * content is added.
 *
 * Body: { items: AlertItem[], secret: string }
 *
 * Each paid subscriber's preferences are checked:
 *   - trigger_documents / trigger_hearings / trigger_milestones / trigger_news
 *   - keywords (if any set, at least one must appear in the item title or summary)
 */
export async function POST(request: NextRequest) {
  // Auth
  const { items, secret } = (await request.json()) as {
    items: AlertItem[];
    secret: string;
  };

  const ingestSecret = process.env.INGEST_SECRET;
  if (ingestSecret && secret !== ingestSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No items to alert on." });
  }

  // Fetch all paid subscribers with their preferences
  const { data: subscribers } = await supabase
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

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No paid subscribers." });
  }

  let sent = 0;

  for (const sub of subscribers) {
    const prefs = (sub as any).alert_preferences?.[0] || {
      trigger_documents: true,
      trigger_hearings: false,
      trigger_milestones: false,
      trigger_news: false,
      keywords: [],
      frequency: "realtime",
    };

    // Skip daily-digest subscribers — they'll get a batched email instead
    if (prefs.frequency === "daily") continue;

    // Filter items to those matching this subscriber's preferences
    const matchingItems = items.filter((item) => {
      // Check trigger type
      const typeMatch =
        (item.type === "document" && prefs.trigger_documents) ||
        (item.type === "event" && prefs.trigger_hearings) ||
        (item.type === "news" && prefs.trigger_news);

      if (!typeMatch) return false;

      // If subscriber has keywords, check at least one matches
      const keywords = prefs.keywords || [];
      if (keywords.length > 0) {
        const text = `${item.title} ${item.summary}`.toLowerCase();
        return keywords.some((kw: string) => text.includes(kw.toLowerCase()));
      }

      return true;
    });

    if (matchingItems.length === 0) continue;

    // Send the email
    try {
      await sendEmail({
        to: sub.email,
        subject: buildAlertSubject(matchingItems),
        html: buildAlertEmailHtml(matchingItems).replace(
          "{{email}}",
          encodeURIComponent(sub.email)
        ),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send alert to ${sub.email}:`, err);
    }
  }

  return NextResponse.json({ sent, total_subscribers: subscribers.length });
}
