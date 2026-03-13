import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const checkoutUrl = await createCheckoutSession(email);
    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
