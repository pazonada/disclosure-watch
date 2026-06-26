import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBatchEmail } from "@/lib/resend";
import { buildDigestEmailHtml } from "@/lib/alert-email";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

/**
 * Fallback: if no draft digest exists in Supabase (e.g. Supabase was paused
 * when Monday's ingest tried to write the draft), read the current weekly
 * summary from disk and send it. This ensures subscribers get a weekly email
 * even if the upstream digest-creation step silently failed.
 */
async function readCurrentWeeklySummary(): Promise<{ weekOf: string; summary: string } | null> {
  try {
    const filePath = path.join(process.cwd(), "content", "weekly-summary.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as { weekOf?: string; summary?: string };
    if (data.weekOf && data.summary && data.summary.trim().length > 20) {
      return { weekOf: data.weekOf, summary: data.summary };
    }
  } catch {
    // file missing or unreadable
  }
  return null;
}

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

    // Safety brake — never send more than this many digests in one cron
    // firing. This prevents the "backlog drain" scenario where a route that
    // hasn't fired for weeks finds N pending digests and tries to send N ×
    // (audience size) emails all at once — which is how we accidentally
    // blasted subscribers with stale content after fixing a long-standing
    // middleware bug. If older drafts pile up, the cancel-backlog endpoint
    // exists for explicit cleanup; auto-send refuses to drain silently.
    const MAX_DIGESTS_PER_RUN = 1;

    // First, count how many digests are pending. If more than the safety
    // cap, log loudly so the operator notices via Vercel logs and the
    // email-monitor's stale-digest flag.
    const { data: allPending, error: countErr } = await supabase
      .from("digests")
      .select("id, week_of")
      .in("status", ["draft", "approved"])
      .lt("auto_send_deadline", now)
      .order("week_of", { ascending: false });

    if (countErr) throw countErr;

    const pendingTotal = allPending?.length || 0;
    if (pendingTotal > MAX_DIGESTS_PER_RUN) {
      console.warn(
        `[auto-send] SAFETY: ${pendingTotal} pending digests but max-per-run is ${MAX_DIGESTS_PER_RUN}. ` +
        `Sending only the most recent (week of ${allPending?.[0]?.week_of}). ` +
        `Older drafts: ${allPending?.slice(1).map((d) => d.week_of).join(", ")}. ` +
        `Use POST /api/admin/digests/cancel-backlog if those should be retired.`
      );
    }

    // Fetch only the most recent N digests (newest first by week_of)
    const { data: pendingDigests, error } = await supabase
      .from("digests")
      .select("*")
      .in("status", ["draft", "approved"])
      .lt("auto_send_deadline", now)
      .order("week_of", { ascending: false })
      .limit(MAX_DIGESTS_PER_RUN);

    if (error) throw error;

    if (!pendingDigests || pendingDigests.length === 0) {
      // Fallback: check whether we have a current weekly summary on disk that
      // should have been queued but wasn't. Check Supabase first to see if it
      // was already sent (prevents duplicate sends).
      const currentSummary = await readCurrentWeeklySummary();
      if (currentSummary) {
        const { data: existing } = await supabase
          .from("digests")
          .select("id, status")
          .eq("week_of", currentSummary.weekOf)
          .limit(1)
          .single();

        if (!existing) {
          // No row exists for this week — create one and send it now
          const { data: inserted, error: insertErr } = await supabase
            .from("digests")
            .insert({
              week_of: currentSummary.weekOf,
              summary_text: currentSummary.summary,
              status: "draft",
              auto_send_deadline: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertErr || !inserted) {
            return NextResponse.json({
              message: "No digests to auto-send (fallback insert failed)",
              error: insertErr?.message,
              sent: 0,
            });
          }

          const weekLabel = new Date(inserted.week_of).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          const html = buildDigestEmailHtml(inserted.summary_text, weekLabel);
          const result = await sendBatchEmail({
            subject: `Disclosure Watch Weekly Briefing: Week of ${weekLabel}`,
            html,
          });
          await supabase
            .from("digests")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", inserted.id);

          return NextResponse.json({
            message: `Auto-sent recovered digest for week of ${currentSummary.weekOf}`,
            sent: result.sent,
            failed: result.failed,
            errors: result.errors,
            recovered: true,
          });
        }
      }

      return NextResponse.json({ message: "No digests to auto-send", sent: 0 });
    }

    let totalSent = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

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

      // Only mark sent if at least one batch succeeded. If all batches failed,
      // leave the digest as draft/approved so the next cron retries it.
      if (result.sent > 0) {
        await supabase
          .from("digests")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", digest.id);
      }

      totalSent += result.sent;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
    }

    return NextResponse.json({
      message: `Auto-sent ${pendingDigests.length} digest(s)`,
      sent: totalSent,
      failed: totalFailed,
      errors: allErrors,
    });
  } catch (err) {
    console.error("Auto-send error:", err);
    return NextResponse.json({ error: "Auto-send failed" }, { status: 500 });
  }
}
