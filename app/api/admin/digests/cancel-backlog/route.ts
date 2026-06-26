import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/digests/cancel-backlog
 *
 * Marks every digest currently in "draft" or "approved" status as "sent"
 * EXCEPT the single most recent one (by week_of). No emails are actually
 * sent — this just clears a backlog of digests that piled up during the
 * months auto-send was middleware-blocked, so the next auto-send cron
 * only fires the latest weekly digest instead of trying to drain months
 * of stale content.
 *
 * The `sent_at` timestamp is set to NOW so the rows look as if they sent
 * successfully and won't get retried by the auto-send cron.
 *
 * Idempotent — re-running it is a no-op once the backlog is cleared.
 *
 * Auth: requires Authorization: Bearer <INGEST_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // List all pending digests, newest first
  const { data: pending, error: listErr } = await supabase
    .from("digests")
    .select("id, week_of, status")
    .in("status", ["draft", "approved"])
    .order("week_of", { ascending: false });

  if (listErr) {
    return NextResponse.json(
      { error: "Supabase list failed", details: listErr.message },
      { status: 500 }
    );
  }

  const pendingList = pending || [];
  if (pendingList.length <= 1) {
    return NextResponse.json({
      message: "Nothing to cancel — 0 or 1 pending digests.",
      pending: pendingList.length,
      cancelled: 0,
      kept: pendingList[0] || null,
    });
  }

  const [keep, ...toCancel] = pendingList;
  const idsToCancel = toCancel.map((d) => d.id);

  const { error: updateErr, count } = await supabase
    .from("digests")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .in("id", idsToCancel)
    .select("*", { count: "exact", head: true });

  if (updateErr) {
    return NextResponse.json(
      { error: "Supabase update failed", details: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: `Cancelled ${count ?? idsToCancel.length} backlogged digests, kept the latest.`,
    cancelled: count ?? idsToCancel.length,
    kept: keep,
    cancelledIds: idsToCancel,
  });
}
