import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBatchEmail } from "@/lib/resend";
import { buildDigestEmailHtml } from "@/lib/alert-email";

export const dynamic = "force-dynamic";

/**
 * Auto-send cron: Checks for any digest past its deadline that hasn't been sent.
 * Called by Vercel Cron on Fridays at ~12:15 PM ET.
 *
 * Logic:
 * - Find digests with status "draft" or "approved" where auto_send_deadline < now()
 * - Send each to all active subscribers
 * - Mark as "sent"
 */
export async function GET(req: NextRequest) {
  // Verify cron secret or bearer token
  const cronSecret = req.headers.get("x-vercel-cron-secret");
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.INGEST_SECRET;

  if (expectedSecret) {
    const validCron = cronSecret === expectedSecret;
    const validBearer = authHeader === `Bearer ${expectedSecret}`;
    if (!validCron && !validBearer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date().toISOString();

    // Find unsent digests past their deadline
    const { data: pendingDigests, error } = await supabase
      .from("digests")
      .select("*")
      .in("status", ["draft", "approved"])
      .lt("auto_send_deadline", now);

    if (error) throw error;

    if (!pendingDigests || pendingDigests.length === 0) {
      return NextResponse.json({ message: "No digests to auto-send", sent: 0 });
    }

    let totalSent = 0;

    for (const digest of pendingDigests) {
      if (!digest.summary_text.trim()) continue;

      const weekLabel = new Date(digest.week_of).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const html = buildDigestEmailHtml(digest.summary_text, weekLabel);
      const subject = `Disclosure Watch Weekly Briefing: Week of ${weekLabel}`;

      const result = await sendBatchEmail({ subject, html });

      await supabase
        .from("digests")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", digest.id);

      totalSent += result.sent;
    }

    return NextResponse.json({
      message: `Auto-sent ${pendingDigests.length} digest(s)`,
      sent: totalSent,
    });
  } catch (err) {
    console.error("Auto-send error:", err);
    return NextResponse.json({ error: "Auto-send failed" }, { status: 500 });
  }
}
