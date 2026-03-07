import { NextRequest, NextResponse } from "next/server";
import { addContact, sendEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    // Add to Resend audience
    await addContact(email);

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
                You'll receive alerts when new UAP government documents, hearings, or major
                disclosure developments are added to the tracker.
              </p>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                We also send a weekly digest every Friday with the latest updates.
                No spam, ever.
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
    } catch {
      // Welcome email failed — non-fatal, they're still subscribed
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);

    // If Resend isn't configured yet, still accept gracefully
    if (String(err).includes("not set")) {
      console.log(`Subscriber queued (Resend not configured): ${(await request.clone().json()).email}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to subscribe. Please try again." }, { status: 500 });
  }
}
