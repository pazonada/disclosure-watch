import { NextRequest, NextResponse } from "next/server";
import { AlertItem } from "@/lib/alert-email";
import { dispatchAlertsToSubscribers } from "@/lib/alert-dispatcher";

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

  const result = await dispatchAlertsToSubscribers(items);
  return NextResponse.json({
    sent: result.sent,
    total_subscribers: result.totalSubscribers,
    reason: result.reason,
    error: result.error,
  });
}
