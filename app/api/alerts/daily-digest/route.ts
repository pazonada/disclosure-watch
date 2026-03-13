import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import {
  buildDailyDigestEmailHtml,
  buildDailyDigestSubject,
  AlertItem,
} from "@/lib/alert-email";

export const dynamic = "force-dynamic";

/**
 * GET /api/alerts/daily-digest
 *
 * Triggered daily by Vercel cron. Sends a batched alert email to
 * subscribers who chose frequency = "daily". Collects all content
 * ingested in the last 24 hours and filters by each subscriber's
 * trigger types and keywords.
 */
export async function GET(request: NextRequest) {
  // Auth — accept cron secret or bearer token
  const secret = process.env.INGEST_SECRET;
  const cronSecret = request.headers.get("x-vercel-cron-secret") || "";

  if (secret && cronSecret !== secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Gather items from the last 24 hours by reading the current content files
  // and filtering by addedDate/publishedDate within the last day
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const items: AlertItem[] = [];

  try {
    // Load documents added today
    const docsModule = await import("@/content/documents.json");
    const docs = (docsModule.default || []) as any[];
    for (const doc of docs) {
      if (doc.addedDate >= cutoffStr) {
        items.push({
          title: doc.title,
          type: "document",
          url: doc.sourceUrl,
          summary: doc.summary || "",
          date: doc.publishedDate || doc.addedDate,
        });
      }
    }
  } catch {
    // content file may not exist
  }

  try {
    // Load news added today
    const newsModule = await import("@/content/news.json");
    const news = (newsModule.default || []) as any[];
    for (const n of news) {
      if (n.publishedDate >= cutoffStr) {
        items.push({
          title: n.title,
          type: "news",
          url: n.url,
          summary: n.description || "",
          date: n.publishedDate,
        });
      }
    }
  } catch {
    // content file may not exist
  }

  try {
    // Load events added today
    const eventsModule = await import("@/content/events.json");
    const events = (eventsModule.default || []) as any[];
    for (const e of events) {
      if (e.date >= cutoffStr) {
        items.push({
          title: e.title,
          type: "event",
          url: e.sourceUrl,
          summary: e.description || "",
          date: e.date,
        });
      }
    }
  } catch {
    // content file may not exist
  }

  if (items.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No new items in the last 24 hours." });
  }

  // Fetch daily-digest subscribers
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

    // Only send to daily-digest subscribers
    if (prefs.frequency !== "daily") continue;

    // Filter items by subscriber preferences
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

    if (matchingItems.length === 0) continue;

    try {
      await sendEmail({
        to: sub.email,
        subject: buildDailyDigestSubject(matchingItems),
        html: buildDailyDigestEmailHtml(matchingItems).replace(
          "{{email}}",
          encodeURIComponent(sub.email)
        ),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send daily digest to ${sub.email}:`, err);
    }
  }

  return NextResponse.json({ sent, items_available: items.length });
}
