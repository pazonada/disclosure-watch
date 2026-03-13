import { NextRequest, NextResponse } from "next/server";
import { createPortalSession, getCustomerByEmail } from "@/lib/stripe";
import { getSessionEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so subscribers can
 * manage billing, update payment method, or cancel.
 * Requires a valid dw_alerts_session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const email = await getSessionEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return NextResponse.json(
        { error: "No active subscription found for this email." },
        { status: 404 }
      );
    }

    const portalUrl = await createPortalSession(customer.id);
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session." },
      { status: 500 }
    );
  }
}
