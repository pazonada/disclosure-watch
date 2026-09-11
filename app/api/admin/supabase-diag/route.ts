import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/supabase-diag
 *
 * Diagnostic-only. Reports whether required env vars are present (booleans,
 * not values) and probes a real Supabase UPDATE + SELECT round-trip so we
 * can see whether writes are actually landing. Auth: Authorization: Bearer
 * <INGEST_SECRET>.
 *
 * Delete after diagnosis.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
    keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    urlHost: (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").host;
      } catch {
        return null;
      }
    })(),
  };

  // Read: how many rows in subscribers?
  const readProbe = await supabase
    .from("subscribers")
    .select("email, status, unsubscribed_at", { count: "exact", head: false })
    .limit(1);

  // Update probe: pick a specific "already unsubscribed" address (the
  // audit endpoint keeps flagging these as unsubscribed on Resend) and
  // try to write the same status back — no semantic change, but if the
  // write pathway is broken we'll see it. Use `.select()` so PostgREST
  // returns the affected rows and we can see how many the WHERE clause
  // matched.
  const probeEmail = new URL(req.url).searchParams.get("email") || "";
  const field = new URL(req.url).searchParams.get("field") || "status";
  let updateProbe: unknown = { skipped: "no ?email= param passed" };
  if (probeEmail) {
    let patch: Record<string, unknown>;
    if (field === "stripe") {
      // A field with no application semantics — proves write plumbing without touching status.
      patch = { stripe_customer_id: `diag-${Date.now()}` };
    } else if (field === "subscribed_at") {
      patch = { subscribed_at: "2020-01-01T00:00:00Z" };
    } else {
      patch = { status: "unsubscribed", unsubscribed_at: new Date().toISOString() };
    }
    const result = await supabase
      .from("subscribers")
      .update(patch)
      .eq("email", probeEmail)
      .select();

    // Immediate re-read via the SAME client to see if the change survived.
    const reread = await supabase
      .from("subscribers")
      .select("*")
      .eq("email", probeEmail)
      .single();

    updateProbe = {
      probeEmail,
      field,
      patch,
      rowsAffected: Array.isArray(result.data) ? result.data.length : null,
      status: result.status,
      statusText: result.statusText,
      error: result.error
        ? { code: result.error.code, message: result.error.message, details: result.error.details }
        : null,
      returnedRowPostUpdate: Array.isArray(result.data) && result.data[0] ? result.data[0] : null,
      rereadRow: reread.data,
      rereadError: reread.error
        ? { code: reread.error.code, message: reread.error.message }
        : null,
    };
  }

  return NextResponse.json({
    env,
    read: {
      error: readProbe.error
        ? { code: readProbe.error.code, message: readProbe.error.message }
        : null,
      count: readProbe.count,
      sampleRow: readProbe.data?.[0] ?? null,
    },
    update: updateProbe,
  });
}
