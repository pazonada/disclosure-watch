/**
 * Resend REST API helpers for Disclosure Watch.
 *
 * Uses the Resend Audiences/Contacts API to store subscribers
 * and the Send API to deliver emails. No SDK needed.
 *
 * Environment variables:
 *   RESEND_API_KEY     — API key from resend.com
 *   RESEND_AUDIENCE_ID — Audience ID (created once in Resend dashboard)
 */

const RESEND_BASE = "https://api.resend.com";

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return key;
}

function getAudienceId(): string {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) throw new Error("RESEND_AUDIENCE_ID not set");
  return id;
}

// ── Contacts (subscriber management) ────────────────────────────────────────

export async function addContact(email: string): Promise<{ id: string }> {
  const resp = await fetch(
    `${RESEND_BASE}/audiences/${getAudienceId()}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend addContact failed: ${resp.status} ${err}`);
  }

  return resp.json();
}

export async function removeContact(email: string): Promise<void> {
  // Resend's delete contact endpoint uses the contact ID, but we can also
  // update the contact to set unsubscribed: true
  const resp = await fetch(
    `${RESEND_BASE}/audiences/${getAudienceId()}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: true }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend removeContact failed: ${resp.status} ${err}`);
  }
}

export async function getContacts(): Promise<
  Array<{ id: string; email: string; unsubscribed: boolean }>
> {
  const resp = await fetch(
    `${RESEND_BASE}/audiences/${getAudienceId()}/contacts`,
    {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend getContacts failed: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  return data?.data || [];
}

// ── Email sending ───────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const resp = await fetch(`${RESEND_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: options.from || "Disclosure Watch <alerts@disclosurewatch.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend sendEmail failed: ${resp.status} ${err}`);
  }
}

/** Send to all active subscribers using Resend Batch API */
export async function sendBatchEmail(options: {
  subject: string;
  html: string;
  from?: string;
  /**
   * Optional explicit recipient list. If provided, sends to exactly these
   * addresses instead of pulling the full Resend audience. Used by the
   * multi-day digest batching in /api/admin/digests/auto-send.
   */
  recipients?: string[];
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  let recipientEmails: string[];
  if (options.recipients) {
    recipientEmails = options.recipients;
  } else {
    const contacts = await getContacts();
    recipientEmails = contacts
      .filter((c) => !c.unsubscribed)
      .map((c) => c.email);
  }

  if (recipientEmails.length === 0) {
    console.log("[Resend] sendBatchEmail: no recipients");
    return { sent: 0, failed: 0, errors: [] };
  }

  // Resend batch API supports up to 100 emails per call
  const from = options.from || "Disclosure Watch <alerts@disclosurewatch.com>";
  const batches: Array<Array<{ from: string; to: string; subject: string; html: string }>> = [];
  const emails = recipientEmails.map((email) => ({
    from,
    to: email,
    subject: options.subject,
    html: options.html,
  }));

  for (let i = 0; i < emails.length; i += 100) {
    batches.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const resp = await fetch(`${RESEND_BASE}/emails/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (resp.ok) {
      sent += batch.length;
    } else {
      failed += batch.length;
      const body = await resp.text().catch(() => "<no body>");
      const msg = `batch ${batchIdx + 1}/${batches.length} HTTP ${resp.status}: ${body.slice(0, 200)}`;
      errors.push(msg);
      console.error(`[Resend] sendBatchEmail ${msg}`);
    }
  }

  console.log(
    `[Resend] sendBatchEmail done: ${sent} sent, ${failed} failed across ${batches.length} batch(es)`
  );

  return { sent, failed, errors };
}
