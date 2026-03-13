/**
 * Stripe helpers for Disclosure Watch paid alerts.
 *
 * Uses the Stripe REST API directly (no SDK) to keep the bundle lean.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY       — sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET   — whsec_… from the Stripe dashboard
 *   STRIPE_PRICE_ID         — price_… for the $5/mo alerts plan
 *   NEXT_PUBLIC_SITE_URL    — e.g. https://disclosurewatch.com
 */

const STRIPE_BASE = "https://api.stripe.com/v1";

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return key;
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return secret;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";
}

async function stripeRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, string>
): Promise<any> {
  const resp = await fetch(`${STRIPE_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Stripe ${method} ${endpoint} failed: ${resp.status} ${err}`);
  }

  return resp.json();
}

// ── Checkout ────────────────────────────────────────────────────────────────

export async function createCheckoutSession(email: string): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID not set");

  const data = await stripeRequest("/checkout/sessions", "POST", {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    customer_email: email,
    success_url: `${getSiteUrl()}/alerts?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getSiteUrl()}/subscribe`,
    allow_promotion_codes: "true",
  });

  return data.url;
}

// ── Customer Portal ─────────────────────────────────────────────────────────

export async function createPortalSession(customerId: string): Promise<string> {
  const data = await stripeRequest("/billing_portal/sessions", "POST", {
    customer: customerId,
    return_url: `${getSiteUrl()}/alerts`,
  });

  return data.url;
}

// ── Retrieve subscription info ──────────────────────────────────────────────

export async function getSubscription(subscriptionId: string): Promise<any> {
  return stripeRequest(`/subscriptions/${subscriptionId}`);
}

export async function getCustomerByEmail(email: string): Promise<any | null> {
  const data = await stripeRequest(`/customers?email=${encodeURIComponent(email)}`);
  return data?.data?.[0] || null;
}

// ── Webhook signature verification ──────────────────────────────────────────

export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<any> {
  const secret = getWebhookSecret();
  const parts = signature.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  // Compute expected signature using Web Crypto API
  const payload = `${parts.timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const valid = parts.signatures.some((s) => s === expected);
  if (!valid) throw new Error("Invalid webhook signature");

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(parts.timestamp)) > tolerance) {
    throw new Error("Webhook timestamp outside tolerance");
  }

  return JSON.parse(body);
}
