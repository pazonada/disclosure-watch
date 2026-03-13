import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle:
 *   - checkout.session.completed  → activate paid tier
 *   - customer.subscription.deleted → revert to free
 *   - customer.subscription.updated → handle plan changes
 *   - invoice.payment_failed → flag for follow-up
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: any;
  try {
    event = await verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (email) {
          await supabase
            .from("subscribers")
            .upsert(
              {
                email,
                tier: "paid",
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: "active",
                subscribed_at: new Date().toISOString(),
              },
              { onConflict: "email" }
            );

          // Create default alert preferences for new paid subscriber
          const { data: subscriber } = await supabase
            .from("subscribers")
            .select("id")
            .eq("email", email)
            .single();

          if (subscriber) {
            await supabase.from("alert_preferences").upsert(
              {
                subscriber_id: subscriber.id,
                trigger_documents: true,
                trigger_hearings: true,
                trigger_milestones: true,
                trigger_news: false,
                keywords: [],
              },
              { onConflict: "subscriber_id" }
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Revert subscriber to free tier
        await supabase
          .from("subscribers")
          .update({ tier: "free", stripe_subscription_id: null })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status;

        // Update subscription status
        if (status === "active") {
          await supabase
            .from("subscribers")
            .update({ tier: "paid" })
            .eq("stripe_customer_id", customerId);
        } else if (status === "past_due" || status === "canceled") {
          await supabase
            .from("subscribers")
            .update({ tier: "free" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.warn(`Payment failed for customer ${invoice.customer}`);
        break;
      }
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    // Return 200 so Stripe doesn't retry endlessly
  }

  return NextResponse.json({ received: true });
}
