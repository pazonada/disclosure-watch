import { NextRequest, NextResponse } from "next/server";
import { getContacts } from "@/lib/resend";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audience-audit
 *
 * Pulls every contact from the Resend audience, applies heuristic bot-signup
 * flags, cross-references Supabase's subscriber timestamps, and returns a
 * summary. Useful before deciding whether to upgrade Resend — if half the
 * "audience" is bot signups, upgrading the plan is the wrong fix.
 *
 * Auth: Authorization: Bearer <INGEST_SECRET>.
 *
 * Flags applied per address:
 *   - gmail-many-dots       — 3+ dots in the local part (Gmail dot-notation abuse)
 *   - gmail-many-short-parts — 4+ dot-separated segments all ≤4 chars
 *   - trailing-digits        — local part ends in one or more digits
 *   - short-random-looking   — local looks like random <8-char string
 *   - unsubscribed           — Resend marked this contact unsubscribed
 *
 * More flags = more likely bot. Zero flags = probably fine.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let contacts: Array<{ email: string; unsubscribed: boolean }>;
  try {
    contacts = await getContacts();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch Resend contacts", details: String(err) },
      { status: 500 }
    );
  }

  // Cross-reference with Supabase for signup timestamps.
  const subscribedAtByEmail = new Map<string, string>();
  try {
    const { data: subs } = await supabase
      .from("subscribers")
      .select("email, subscribed_at");
    for (const s of subs || []) {
      subscribedAtByEmail.set(s.email.toLowerCase(), s.subscribed_at);
    }
  } catch {
    // Supabase not reachable — proceed without timestamps.
  }

  const analyzed = contacts.map((c) => {
    const flags = analyzeAddress(c.email);
    if (c.unsubscribed) flags.push("unsubscribed");
    return {
      email: c.email,
      flags,
      score: flags.filter((f) => f !== "unsubscribed").length,
      subscribed_at: subscribedAtByEmail.get(c.email.toLowerCase()) || null,
    };
  });

  const total = analyzed.length;
  const suspicious = analyzed.filter((a) => a.score >= 2);
  const highSuspicion = analyzed.filter((a) => a.score >= 3);
  const cleanLooking = analyzed.filter((a) => a.score === 0);

  // Signup burst detection: bucket by day
  const dailyCounts = new Map<string, number>();
  for (const a of analyzed) {
    if (!a.subscribed_at) continue;
    const day = a.subscribed_at.slice(0, 10);
    dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  }
  const bursts = Array.from(dailyCounts.entries())
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([day, count]) => ({ day, count }));

  return NextResponse.json({
    summary: {
      total,
      clean_looking: cleanLooking.length,
      suspicious_score_ge_2: suspicious.length,
      high_suspicion_score_ge_3: highSuspicion.length,
      signup_bursts: bursts,
    },
    highSuspicion: highSuspicion
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)
      .map((a) => ({
        email: redact(a.email),
        flags: a.flags,
        score: a.score,
        subscribed_at: a.subscribed_at,
      })),
  });
}

function analyzeAddress(email: string): string[] {
  const flags: string[] = [];
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) {
    flags.push("malformed");
    return flags;
  }

  const isGmail = domain === "gmail.com" || domain === "googlemail.com";

  if (isGmail) {
    const dotCount = (local.match(/\./g) || []).length;
    if (dotCount >= 3) flags.push(`gmail-many-dots(${dotCount})`);
    const parts = local.split(".");
    if (parts.length >= 4 && parts.every((p) => p.length <= 4)) {
      flags.push("gmail-many-short-parts");
    }
  }

  if (/\d+$/.test(local)) {
    const trailingDigits = local.match(/\d+$/)?.[0] || "";
    if (trailingDigits.length >= 2) flags.push(`trailing-digits(${trailingDigits.length})`);
  }

  // "Random-looking" heuristic: no vowel-consonant balance, mostly random
  // consonants + digits, no common name-like patterns. Only fires if the
  // local part is ≤8 chars without dots.
  const localNoDots = local.replace(/\./g, "");
  if (localNoDots.length <= 8 && !localNoDots.match(/^(the|my|hello|hi|contact|info|admin|test)/)) {
    const vowels = (localNoDots.match(/[aeiou]/g) || []).length;
    const consonants = (localNoDots.match(/[b-df-hj-np-tv-z]/g) || []).length;
    if (vowels === 0 && consonants + (localNoDots.match(/\d/g) || []).length === localNoDots.length) {
      flags.push("no-vowels-short");
    }
  }

  return flags;
}

function redact(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(4, local.length));
  return `${visible}***@${domain}`;
}
