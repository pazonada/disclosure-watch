import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBatchEmail } from "@/lib/resend";
import { buildDigestEmailHtml } from "@/lib/alert-email";

export const dynamic = "force-dynamic";

/** Manually send a digest to all active subscribers. */
export async function POST(req: NextRequest) {
  try {
    const { digestId } = await req.json();

    if (!digestId) {
      return NextResponse.json({ error: "digestId required" }, { status: 400 });
    }

    // Fetch the digest
    const { data: digest, error } = await supabase
      .from("digests")
      .select("*")
      .eq("id", digestId)
      .single();

    if (error || !digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    if (digest.status === "sent") {
      return NextResponse.json({ error: "Digest already sent" }, { status: 400 });
    }

    if (!digest.summary_text.trim()) {
      return NextResponse.json({ error: "Digest has no content" }, { status: 400 });
    }

    // Build email
    const weekLabel = new Date(digest.week_of).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const html = buildDigestEmailHtml(digest.summary_text, weekLabel);
    const subject = `Disclosure Watch Weekly Briefing: Week of ${weekLabel}`;

    // Send to all active subscribers
    const result = await sendBatchEmail({ subject, html });

    // Mark as sent
    await supabase
      .from("digests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", digestId);

    return NextResponse.json({ sent: result.sent });
  } catch (err) {
    console.error("Digest send error:", err);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
