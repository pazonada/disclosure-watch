import { NextRequest, NextResponse } from "next/server";
import { getEmailHealthStatus, EmailHealthStatus } from "@/lib/email-health";
import {
  findOpenIssueByLabel,
  createIssue,
  updateIssueBody,
  commentOnIssue,
  closeIssue,
} from "@/lib/github-issues";

export const dynamic = "force-dynamic";

const ALERT_LABEL = "email-monitor";

/**
 * Silent email-pipeline monitor.
 *
 * Runs daily via Vercel cron. Calls the shared health probe. Output channel
 * is a single GitHub issue carrying the `email-monitor` label, managed
 * automatically:
 *
 *   - All good: closes the issue if one is open. Sends nothing else.
 *   - Newly broken: opens a fresh issue listing every detected flag.
 *   - Still broken: edits the existing issue's body with the current flags.
 *     If the flag set changed since last check, posts a comment noting the
 *     new/resolved flags (so the issue notification fires only on real
 *     state changes, not every daily re-check).
 *   - Recovered: closes the issue with a "healed" comment.
 *
 * Vercel logs always get a console.log/error backstop so the failure is
 * recorded even if GitHub itself is unreachable.
 *
 * Required env: GITHUB_TOKEN (fine-grained PAT, Issues: Read and write).
 * Optional env: GITHUB_OWNER, GITHUB_REPO (default pazonada/disclosure-watch).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const cronSecret = req.headers.get("x-vercel-cron-secret") || "";
    const auth = req.headers.get("authorization") || "";
    const adminCookie = req.cookies.get("dw_admin")?.value;
    const validCron = cronSecret === secret;
    const validBearer = auth === `Bearer ${secret}`;
    const validAdmin = adminCookie && adminCookie === process.env.ADMIN_SESSION_SECRET;
    if (!validCron && !validBearer && !validAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const status = await getEmailHealthStatus();
  const isBroken = status.flags.length > 0;

  if (!isBroken) {
    console.log("[EmailMonitor] healthy", {
      audience: status.resend.active,
      subscribers: status.supabase.active,
      lastDigest: status.recentDigests[0]?.sent_at || null,
    });
  } else {
    console.error("[EmailMonitor] PROBLEMS DETECTED:");
    for (const flag of status.flags) console.error(`  - ${flag}`);
  }

  // GitHub Issue side-channel. If GITHUB_TOKEN is missing we still return the
  // status, console.error stays in Vercel logs, but we can't open/close issues.
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({
      ok: !isBroken,
      flags: status.flags,
      issueChannel: { configured: false, reason: "GITHUB_TOKEN not set" },
    });
  }

  let issueChannel: {
    configured: true;
    action: "none" | "opened" | "updated" | "commented" | "closed";
    issue_url?: string;
    error?: string;
  } = { configured: true, action: "none" };

  try {
    const existing = await findOpenIssueByLabel(ALERT_LABEL);

    if (isBroken && !existing) {
      const issue = await createIssue({
        title: `[Monitor] Email pipeline has ${status.flags.length} problem${status.flags.length === 1 ? "" : "s"}`,
        body: buildIssueBody(status),
        labels: [ALERT_LABEL],
      });
      issueChannel.action = "opened";
      issueChannel.issue_url = issue.html_url;
    } else if (isBroken && existing) {
      const previousFlags = extractFlagsFromBody(existing.body || "");
      const currentFlags = new Set(status.flags);
      const changed =
        previousFlags.size !== currentFlags.size ||
        status.flags.some((f) => !previousFlags.has(f));

      await updateIssueBody(existing.number, buildIssueBody(status));
      issueChannel.action = "updated";
      issueChannel.issue_url = existing.html_url;

      if (changed) {
        await commentOnIssue(
          existing.number,
          buildChangeComment(previousFlags, status.flags, status.timestamp)
        );
        issueChannel.action = "commented";
      }
    } else if (!isBroken && existing) {
      await commentOnIssue(
        existing.number,
        `Healed at ${status.timestamp}. Closing automatically.`
      );
      await closeIssue(existing.number);
      issueChannel.action = "closed";
      issueChannel.issue_url = existing.html_url;
    }
  } catch (err) {
    issueChannel.error = String(err);
    console.error("[EmailMonitor] GitHub side-channel failed:", err);
  }

  return NextResponse.json({
    ok: !isBroken,
    flags: status.flags,
    issueChannel,
    timestamp: status.timestamp,
  });
}

function buildIssueBody(status: EmailHealthStatus): string {
  const lines: string[] = [];
  lines.push(`> Auto-managed by \`/api/admin/email-monitor\`. Do not edit the body manually — it gets overwritten on every check.`);
  lines.push("");
  lines.push(`**Last checked:** \`${status.timestamp}\``);
  lines.push("");
  lines.push("## Current flags");
  for (const flag of status.flags) {
    lines.push(`- ${flag}`);
  }
  lines.push("");
  lines.push("## Snapshot");
  lines.push(`- Resend audience: ${status.resend.reachable ? `${status.resend.active} active / ${status.resend.total} total` : `unreachable (${status.resend.error})`}`);
  lines.push(`- Supabase subscribers: ${status.supabase.reachable ? `${status.supabase.active} active (${status.supabase.paid} paid, ${status.supabase.free} free)` : `unreachable (${status.supabase.error})`}`);
  if (status.recentDigests[0]) {
    const d = status.recentDigests[0];
    lines.push(`- Latest digest: \`${d.week_of}\` · status \`${d.status}\` · sent_at \`${d.sent_at || "—"}\``);
  } else {
    lines.push(`- Latest digest: none in Supabase`);
  }
  lines.push("");
  lines.push("## What to check");
  lines.push(`- Hit \`/api/admin/email-health\` for the raw JSON snapshot.`);
  lines.push(`- Vercel logs: search for \`[EmailMonitor]\`, \`[Resend]\`, \`[Subscribe]\` from the last few days.`);
  lines.push(`- This issue closes itself when the next check returns healthy.`);
  return lines.join("\n");
}

/** Extract the bullet-list of flags from a previous issue body so we can diff state. */
function extractFlagsFromBody(body: string): Set<string> {
  const out = new Set<string>();
  const match = body.match(/## Current flags\n([\s\S]*?)\n\n/);
  if (!match) return out;
  for (const line of match[1].split("\n")) {
    const m = line.match(/^- (.+)$/);
    if (m) out.add(m[1].trim());
  }
  return out;
}

function buildChangeComment(
  prev: Set<string>,
  current: string[],
  ts: string
): string {
  const currentSet = new Set(current);
  const added = current.filter((f) => !prev.has(f));
  const resolved = Array.from(prev).filter((f) => !currentSet.has(f));
  const lines: string[] = [`State changed at \`${ts}\`.`];
  if (added.length) {
    lines.push("\n**New flags:**");
    for (const f of added) lines.push(`- ${f}`);
  }
  if (resolved.length) {
    lines.push("\n**Resolved flags:**");
    for (const f of resolved) lines.push(`- ${f}`);
  }
  return lines.join("\n");
}
