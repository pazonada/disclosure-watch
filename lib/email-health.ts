/**
 * Email-pipeline health probe.
 *
 * Returns a structured snapshot of: env-var presence, Resend audience state,
 * Supabase subscriber counts, the last 10 digests, and a `flags` array that
 * names every detected problem. Empty `flags` = healthy.
 *
 * Used by:
 *   - /api/admin/email-health   (admin UI; returns raw JSON)
 *   - /api/admin/email-monitor  (daily cron; alerts on non-empty flags)
 */

import { supabase } from "@/lib/supabase";
import { getContacts } from "@/lib/resend";

export interface EmailHealthStatus {
  timestamp: string;
  env: Record<string, boolean>;
  envProblems: string[];
  resend: {
    reachable: boolean;
    total?: number;
    active?: number;
    unsubscribed?: number;
    sample?: Array<{ email: string; unsubscribed: boolean }>;
    error?: string;
  };
  supabase: {
    reachable: boolean;
    total?: number;
    active?: number;
    unsubscribed?: number;
    paid?: number;
    free?: number;
    error?: string;
  };
  recentDigests: Array<{
    week_of: string;
    status: string;
    sent_at: string | null;
    auto_send_deadline?: string | null;
  }>;
  flags: string[];
}

export async function getEmailHealthStatus(): Promise<EmailHealthStatus> {
  const env = {
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    RESEND_AUDIENCE_ID: Boolean(process.env.RESEND_AUDIENCE_ID),
    SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    INGEST_SECRET: Boolean(process.env.INGEST_SECRET),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    // GITHUB_TOKEN enables the silent monitor's GitHub-Issue side channel.
    // Without it, monitor results are visible in Vercel logs only.
    GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
  };

  const envProblems: string[] = [];
  for (const [k, v] of Object.entries(env)) {
    if (!v) envProblems.push(`Missing env: ${k}`);
  }

  // ── Resend audience ──
  let resend: EmailHealthStatus["resend"] = { reachable: false };
  try {
    const contacts = await getContacts();
    const active = contacts.filter((c) => !c.unsubscribed);
    resend = {
      reachable: true,
      total: contacts.length,
      active: active.length,
      unsubscribed: contacts.length - active.length,
      sample: contacts.slice(0, 5).map((c) => ({
        email: redactEmail(c.email),
        unsubscribed: c.unsubscribed,
      })),
    };
  } catch (err) {
    resend = { reachable: false, error: String(err) };
  }

  // ── Supabase subscribers ──
  let supabaseStatus: EmailHealthStatus["supabase"] = { reachable: false };
  try {
    const { data: subs, error } = await supabase
      .from("subscribers")
      .select("status, tier");
    if (error) throw error;
    const total = subs?.length || 0;
    const active = subs?.filter((s) => s.status === "active").length || 0;
    const paid = subs?.filter((s) => s.tier === "paid").length || 0;
    const free = subs?.filter((s) => s.tier === "free" || !s.tier).length || 0;
    supabaseStatus = {
      reachable: true,
      total,
      active,
      unsubscribed: total - active,
      paid,
      free,
    };
  } catch (err) {
    supabaseStatus = { reachable: false, error: String(err) };
  }

  // ── Recent digests ──
  let recentDigests: EmailHealthStatus["recentDigests"] = [];
  try {
    const { data } = await supabase
      .from("digests")
      .select("week_of, status, sent_at, auto_send_deadline")
      .order("week_of", { ascending: false })
      .limit(10);
    recentDigests = data || [];
  } catch {
    // ignore
  }

  // ── Flags ──
  const flags: string[] = [];
  if (envProblems.length > 0) {
    flags.push(`Required env vars missing: ${envProblems.join(", ")}`);
  }
  if (!resend.reachable) {
    flags.push("Resend API unreachable — check RESEND_API_KEY and audience ID.");
  } else if (resend.active === 0) {
    flags.push(
      "Resend audience has zero active contacts — either no one is signing up or addContact is failing silently."
    );
  }
  if (!supabaseStatus.reachable) {
    flags.push("Supabase unreachable — check SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (
    supabaseStatus.reachable &&
    resend.reachable &&
    supabaseStatus.active !== undefined &&
    resend.active !== undefined &&
    Math.abs(supabaseStatus.active - resend.active) > 2
  ) {
    flags.push(
      `Subscriber-store drift: ${supabaseStatus.active} active in Supabase vs ${resend.active} active in Resend.`
    );
  }
  if (recentDigests.length === 0) {
    flags.push("No digest rows in Supabase — weekly digest has never fired.");
  } else {
    const latest = recentDigests[0];
    if (latest.status !== "sent") {
      flags.push(
        `Latest digest (week of ${latest.week_of}) is "${latest.status}", not sent.`
      );
    } else if (latest.sent_at) {
      const ageDays = Math.floor(
        (Date.now() - new Date(latest.sent_at).getTime()) / 86400000
      );
      // Weekly digest cadence is 7 days; allow 10 before flagging stale.
      if (ageDays > 10) {
        flags.push(
          `Latest digest was sent ${ageDays} days ago — weekly cadence is broken.`
        );
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    env,
    envProblems,
    resend,
    supabase: supabaseStatus,
    recentDigests,
    flags,
  };
}

/** Mask local-part of an email: "audubon@example.com" → "aud***@example.com" */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}
