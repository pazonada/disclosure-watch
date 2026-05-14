import { NextRequest, NextResponse } from "next/server";
import { addContact, sendEmail } from "@/lib/resend";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    // Add to Resend audience
    await addContact(email);

    // Dual-write to Supabase
    try {
      await supabase.from("subscribers").upsert(
        { email, status: "active", subscribed_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch (err) {
      // Supabase write failed — non-fatal, Resend is the source of truth,
      // but log so we can see when dual-writes are diverging.
      console.error("[Subscribe] Supabase upsert failed for", email, err);
    }

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Disclosure Watch",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #e2e8f0;">
            <div style="background: #0f172a; padding: 32px; border-radius: 12px;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">🛸 You're in.</h1>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                Every Friday, you'll get the weekly briefing — a concise rundown of new UAP
                government documents, hearings, legislative updates, and what it all means.
                No spam, ever.
              </p>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Want updates the moment news breaks?
                <a href="https://disclosurewatch.com/subscribe" style="color: #60a5fa; text-decoration: underline;">Become an Insider</a>
                for real-time alerts on new documents, hearings, and major developments — with
                keyword filters to focus on what matters to you. $5/mo.
              </p>
              <a href="https://disclosurewatch.com" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Visit Disclosure Watch →
              </a>
              <p style="color: #475569; font-size: 12px; margin-top: 32px;">
                You can unsubscribe anytime by clicking the link at the bottom of any email.
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      // Welcome email failed — non-fatal, they're still subscribed. Log so we
      // notice when domain verification or templating breaks the send.
      console.error("[Subscribe] Welcome email failed for", email, err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Subscribe] Failed for", await safeReadEmail(request), err);

    // If Resend isn't configured, still accept gracefully — but loudly so the
    // operator notices in Vercel logs and can fix env vars.
    if (String(err).includes("not set")) {
      console.error(
        "[Subscribe] WARNING: Resend env vars missing in this environment. " +
        "Subscribers are being accepted but NOT added to the audience and will " +
        "receive nothing. Set RESEND_API_KEY and RESEND_AUDIENCE_ID in Vercel."
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to subscribe. Please try again." }, { status: 500 });
  }
}

async function safeReadEmail(request: NextRequest): Promise<string> {
  try {
    const body = await request.clone().json();
    return body?.email || "<no email>";
  } catch {
    return "<unreadable body>";
  }
}
