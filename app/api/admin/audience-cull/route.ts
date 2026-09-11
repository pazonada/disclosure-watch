import { NextRequest, NextResponse } from "next/server";
import { getContacts, removeContact } from "@/lib/resend";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/audience-cull
 *
 * Unsubscribes high-suspicion (bot-pattern) addresses from both the Resend
 * audience and the Supabase subscribers table. Uses the same heuristics as
 * /api/admin/audience-audit.
 *
 * Auth: Authorization: Bearer <INGEST_SECRET>.
 * Body: {
 *   threshold?: number,   // minimum score to cull (default: 3, "high suspicion")
 *   dryRun?: boolean,     // if true, don't actually cull (default: true — must opt in)
 *   maxCullFraction?: number, // safety cap, default 0.25 (never remove >25% of audience in one call)
 * }
 *
 * Safety:
 *   - Defaults to dry-run so callers can't accidentally nuke the audience.
 *   - Refuses to remove more than maxCullFraction of the audience (default 25%).
 *   - Marks contacts as unsubscribed rather than deleting — reversible.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    threshold?: number;
    dryRun?: boolean;
    maxCullFraction?: number;
  };
  const threshold = body.threshold ?? 3;
  const dryRun = body.dryRun !== false; // defaults to true
  const maxCullFraction = body.maxCullFraction ?? 0.25;

  let contacts: Array<{ email: string; unsubscribed: boolean }>;
  try {
    contacts = await getContacts();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch Resend contacts", details: String(err) },
      { status: 500 }
    );
  }

  // Same heuristics as /audience-audit — kept in sync manually. If we
  // add/change flags there, update here too.
  const targets = contacts.filter((c) => {
    if (c.unsubscribed) return false;
    return analyzeAddress(c.email).length >= threshold;
  });

  const total = contacts.length;
  const fraction = total > 0 ? targets.length / total : 0;

  if (fraction > maxCullFraction) {
    return NextResponse.json(
      {
        error: "Safety brake tripped",
        message: `Cull would remove ${targets.length}/${total} (${Math.round(fraction * 100)}%), exceeding maxCullFraction=${Math.round(maxCullFraction * 100)}%. Refusing.`,
        threshold,
        targets: targets.length,
      },
      { status: 412 }
    );
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      threshold,
      wouldCull: targets.length,
      totalAudience: total,
      fractionOfAudience: fraction,
      preview: targets.slice(0, 20).map((c) => redact(c.email)),
    });
  }

  // Actually cull. Track results per address.
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];
  for (const c of targets) {
    try {
      await removeContact(c.email);
      // Also mark unsubscribed in Supabase so our subscriber counts stay in sync.
      try {
        await supabase
          .from("subscribers")
          .update({
            status: "unsubscribed",
            unsubscribed_at: new Date().toISOString(),
          })
          .eq("email", c.email);
      } catch {
        // non-fatal
      }
      results.push({ email: redact(c.email), ok: true });
    } catch (err) {
      results.push({ email: redact(c.email), ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    dryRun: false,
    threshold,
    totalAudience: total,
    culled: succeeded,
    failed,
    firstFailures: results.filter((r) => !r.ok).slice(0, 5),
  });
}

// ── Bot-pattern heuristics — kept in sync with /audience-audit ──

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
    // Severe dot-abuse pattern (mirror of audience-audit heuristic — keep
    // in sync). Fires as a third distinct flag so Gmail dot-notation bots
    // reach the cull threshold without also needing trailing digits.
    if (dotCount >= 4 && parts.length >= 5) {
      const shortParts = parts.filter((p) => p.length <= 3).length;
      if (shortParts >= parts.length - 2) {
        flags.push("gmail-dot-abuse-severe");
      }
    }
  }

  if (/\d+$/.test(local)) {
    const trailingDigits = local.match(/\d+$/)?.[0] || "";
    if (trailingDigits.length >= 2) flags.push(`trailing-digits(${trailingDigits.length})`);
  }

  const localNoDots = local.replace(/\./g, "");
  if (
    localNoDots.length <= 8 &&
    !localNoDots.match(/^(the|my|hello|hi|contact|info|admin|test)/)
  ) {
    const vowels = (localNoDots.match(/[aeiou]/g) || []).length;
    const consonants = (localNoDots.match(/[b-df-hj-np-tv-z]/g) || []).length;
    const digits = (localNoDots.match(/\d/g) || []).length;
    if (vowels === 0 && consonants + digits === localNoDots.length) {
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
