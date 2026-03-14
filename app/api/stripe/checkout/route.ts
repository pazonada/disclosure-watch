import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, preferences } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Block duplicate subscriptions — check if this email already has an active one
    const { data: existing } = await supabase
      .from("subscribers")
      .select("tier, stripe_subscription_id")
      .eq("email", normalizedEmail)
      .single();

    if (existing?.tier === "paid" && existing?.stripe_subscription_id) {
      return NextResponse.json(
        {
          error: "This email already has an active Insider subscription.",
          alreadySubscribed: true,
        },
        { status: 409 }
      );
    }

    const checkoutUrl = await createCheckoutSession(email, preferences);
    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
