import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import { buildVerificationEmailHtml } from "@/lib/alert-email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/verify — Send a 6-digit verification code
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Confirm subscriber exists and is paid
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("id, tier")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!subscriber || subscriber.tier !== "paid") {
      return NextResponse.json(
        { error: "No active Insider subscription found for this email." },
        { status: 403 }
      );
    }

    // Rate limit: max 5 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase().trim())
      .gt("created_at", oneHourAgo);

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again later." },
        { status: 429 }
      );
    }

    // Clean up expired codes for this email
    await supabase
      .from("email_verification_codes")
      .delete()
      .eq("email", email.toLowerCase().trim())
      .lt("expires_at", new Date().toISOString())
      .is("verified_at", null);

    // Generate 6-digit code
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await supabase.from("email_verification_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt,
    });

    // Send the code via email
    await sendEmail({
      to: email,
      subject: "Your Disclosure Watch verification code",
      html: buildVerificationEmailHtml(code),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verification send error:", err);
    return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
  }
}

/**
 * PUT /api/alerts/verify — Verify a code and create a session
 * Body: { email: string, code: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Look up the code
    const { data: row } = await supabase
      .from("email_verification_codes")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("code", code)
      .is("verified_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!row) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await supabase
      .from("email_verification_codes")
      .update({
        verified_at: now,
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt,
      })
      .eq("id", row.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set("dw_alerts_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (err) {
    console.error("Verification verify error:", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
