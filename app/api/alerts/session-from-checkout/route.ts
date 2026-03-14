import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSession } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/session-from-checkout
 *
 * Called immediately after Stripe checkout redirect. Does two things:
 *
 * 1. ALWAYS returns the user's preferences (from Stripe metadata) and email
 *    so the client can show a confirmation screen instantly — no DB or auth needed.
 *
 * 2. Best-effort: tries to create a session cookie so the user can later
 *    edit preferences without email verification. This may fail if the
 *    webhook hasn't fired yet, and that's fine — the confirmation screen
 *    shows either way.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    // Retrieve checkout session from Stripe
    let session: any;
    try {
      session = await getCheckoutSession(sessionId);
    } catch {
      return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const email = session.customer_email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "No email in session" }, { status: 400 });
    }

    // ── Pull preferences directly from Stripe checkout metadata ──
    // This works instantly — no webhook or DB needed.
    const meta = session.metadata || {};
    let keywords: string[] = [];
    try {
      keywords = meta.keywords ? JSON.parse(meta.keywords) : [];
    } catch {
      keywords = [];
    }

    const preferences = {
      trigger_documents: meta.trigger_documents !== "false",
      trigger_hearings: meta.trigger_hearings === "true",
      trigger_milestones: meta.trigger_milestones === "true",
      trigger_news: meta.trigger_news === "true",
      keywords,
      frequency: (meta.frequency === "daily" ? "daily" : "realtime") as "daily" | "realtime",
    };

    // ── Best-effort: create session cookie ──
    // If the webhook has already created the subscriber record, we can set
    // a cookie now so they can edit preferences later without verification.
    let authenticated = false;
    let sessionToken: string | null = null;

    try {
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", email)
        .single();

      if (subscriber) {
        sessionToken = crypto.randomUUID();
        const sessionExpiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        await supabase.from("email_verification_codes").insert({
          email,
          code: "checkout",
          expires_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt,
        });

        authenticated = true;
      }
    } catch {
      // Webhook may not have fired yet — that's OK.
    }

    // Build response — always include email + preferences
    const response = NextResponse.json({ email, preferences, authenticated });

    // Set session cookie if we managed to authenticate
    if (sessionToken) {
      response.cookies.set("dw_alerts_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (err) {
    console.error("Session from checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
