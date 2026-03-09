import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** GET: List all digests, newest first. */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("digests")
      .select("*")
      .order("week_of", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ digests: data });
  } catch (err) {
    console.error("Digests list error:", err);
    return NextResponse.json({ error: "Failed to load digests" }, { status: 500 });
  }
}

/** PATCH: Update a specific digest (for editing text, changing status). */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, summary_text, paid_text, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Digest ID required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (summary_text !== undefined) updates.summary_text = summary_text;
    if (paid_text !== undefined) updates.paid_text = paid_text;
    if (status !== undefined) {
      updates.status = status;
      if (status === "approved") updates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("digests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ digest: data });
  } catch (err) {
    console.error("Digest update error:", err);
    return NextResponse.json({ error: "Failed to update digest" }, { status: 500 });
  }
}
