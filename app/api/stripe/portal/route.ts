import { NextRequest, NextResponse } from "next/server";
import { createPortalSession, getCustomerByEmail } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so subscribers can
 * manage billing, update payment method, or cancel.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
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
