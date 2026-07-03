import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/digests/reset-latest
 *
 * One-off endpoint: finds the most recent digest with status="sent" and
 * flips it back to "draft" (clearing sent_at). Used when a Friday send
 * partially succeeded (quota-limited) and we want the subsequent Sat + Sun
 * multi-day cron runs to re-attempt delivery to the un-sent slice.
 *
 * Auth: Authorization: Bearer <INGEST_SECRET>.
 * Body: none.
 *
 * Safety:
 *   - Only touches the SINGLE most recent sent digest (by week_of).
 *   - No-op if that digest was sent more than 3 days ago (guards against
 *     accidentally re-firing old weekly briefings).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: digest, error: findErr } = await supabase
    .from("digests")
    .select("*")
    .eq("status", "sent")
    .order("week_of", { ascending: false })
    .limit(1)
    .single();

  if (findErr || !digest) {
    return NextResponse.json(
      { error: "No sent digest found.", details: findErr?.message },
      { status: 404 }
    );
  }

  if (!digest.sent_at) {
    return NextResponse.json(
      { error: "Latest sent digest has no sent_at — refusing to reset.", digest },
      { status: 400 }
    );
  }

  const ageMs = Date.now() - new Date(digest.sent_at).getTime();
  const ageDays = ageMs / 86_400_000;
  if (ageDays > 3) {
    return NextResponse.json(
      {
        error: `Latest sent digest was sent ${ageDays.toFixed(1)} days ago — too old to reset. Guard against re-firing stale briefings.`,
        digest: { id: digest.id, week_of: digest.week_of, sent_at: digest.sent_at },
      },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabase
    .from("digests")
    .update({ status: "draft", sent_at: null })
    .eq("id", digest.id);

  if (updateErr) {
    return NextResponse.json(
      { error: "Supabase update failed", details: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Latest sent digest reset to draft.",
    digest: {
      id: digest.id,
      week_of: digest.week_of,
      previously_sent_at: digest.sent_at,
    },
  });
}
