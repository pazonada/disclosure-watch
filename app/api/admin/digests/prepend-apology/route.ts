import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/digests/prepend-apology
 *
 * One-off endpoint used to prepend an apology note to the next pending
 * weekly digest. Used after a stray-send incident so the next regular
 * email softly acknowledges the issue without sending an extra
 * dedicated apology email.
 *
 * Auth: Authorization: Bearer <INGEST_SECRET>.
 * Body: { apology: string }  — the text to prepend.
 *
 * Behaviour:
 *   - Finds the most recent digest with status in (draft, approved).
 *   - Prepends the apology text + a blank line to its summary_text.
 *   - Idempotent if the same apology is already at the start of the text.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { apology?: string };
  const apology = (body.apology || "").trim();
  if (!apology) {
    return NextResponse.json(
      { error: "Body must include 'apology' string." },
      { status: 400 }
    );
  }

  const { data: digest, error: findErr } = await supabase
    .from("digests")
    .select("*")
    .in("status", ["draft", "approved"])
    .order("week_of", { ascending: false })
    .limit(1)
    .single();

  if (findErr || !digest) {
    return NextResponse.json(
      { error: "No pending digest found.", details: findErr?.message },
      { status: 404 }
    );
  }

  const currentText = (digest.summary_text || "").trim();
  if (currentText.startsWith(apology)) {
    return NextResponse.json({
      message: "Apology already present at start of digest summary — no-op.",
      digest: { id: digest.id, week_of: digest.week_of, status: digest.status },
    });
  }

  const newText = `${apology}\n\n${currentText}`;
  const { error: updateErr } = await supabase
    .from("digests")
    .update({ summary_text: newText })
    .eq("id", digest.id);

  if (updateErr) {
    return NextResponse.json(
      { error: "Supabase update failed", details: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Apology prepended to digest.",
    digest: {
      id: digest.id,
      week_of: digest.week_of,
      status: digest.status,
      preview: newText.slice(0, 220),
    },
  });
}
