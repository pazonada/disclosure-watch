import { NextRequest, NextResponse } from "next/server";
import { getContentHealthStatus, ContentHealthStatus } from "@/lib/content-health";
import {
  findOpenIssueByLabel,
  createIssue,
  updateIssueBody,
  commentOnIssue,
  closeIssue,
} from "@/lib/github-issues";

export const dynamic = "force-dynamic";

const ALERT_LABEL = "content-monitor";

/**
 * Silent content-freshness monitor. Daily Vercel cron.
 *
 * Detects the "site silently gone stale" failure class — regardless of
 * which specific step in the ingest→commit→build→deploy pipeline broke.
 * On flag, opens a single GitHub issue labelled `content-monitor` with
 * concrete diagnostics; edits the body on subsequent still-broken runs;
 * closes the issue when healed.
 *
 * Same channel + shape as email-monitor. Silent-when-healthy, noisy-only-
 * on-actual-problems. @pazonada mention in the issue body so notifications
 * fire regardless of watch settings.
 *
 * Required env: GITHUB_TOKEN (fine-grained PAT, Issues: Read and write).
 * Optional env: GITHUB_OWNER, GITHUB_REPO, MONITOR_MENTION.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const cronSecret = req.headers.get("x-vercel-cron-secret") || "";
    const auth = req.headers.get("authorization") || "";
    const adminCookie = req.cookies.get("dw_admin")?.value;
    const validCron = cronSecret === secret;
    const validBearer = auth === `Bearer ${secret}`;
    const validAdmin =
      adminCookie && adminCookie === process.env.ADMIN_SESSION_SECRET;
    if (!validCron && !validBearer && !validAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const status = await getContentHealthStatus();
  const isBroken = status.flags.length > 0;

  if (!isBroken) {
    console.log("[ContentMonitor] healthy", {
      newestLiveNews: status.live.newestNewsAddedDate,
      weeklyWeekOf: status.live.weeklySummaryWeekOf,
      ingestAgeHours: status.repo.ingestAgeHours,
    });
  } else {
    console.error("[ContentMonitor] STALENESS DETECTED:");
    for (const flag of status.flags) console.error(`  - ${flag}`);
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({
      ok: !isBroken,
      flags: status.flags,
      issueChannel: {
        configured: false,
        reason: "GITHUB_TOKEN not set",
      },
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
        title: `[Monitor] Site content is stale (${status.flags.length} problem${status.flags.length === 1 ? "" : "s"})`,
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
        `Content freshness restored at ${status.timestamp}. Closing.`
      );
      await closeIssue(existing.number);
      issueChannel.action = "closed";
      issueChannel.issue_url = existing.html_url;
    }
  } catch (err) {
    issueChannel.error = String(err);
    console.error("[ContentMonitor] GitHub side-channel failed:", err);
  }

  return NextResponse.json({
    ok: !isBroken,
    flags: status.flags,
    issueChannel,
    timestamp: status.timestamp,
  });
}

function buildIssueBody(status: ContentHealthStatus): string {
  const mention = process.env.MONITOR_MENTION || "@pazonada";
  const lines: string[] = [];
  lines.push(`${mention} — the content-freshness monitor detected staleness.`);
  lines.push("");
  lines.push(
    `> Auto-managed by \`/api/admin/content-monitor\`. Do not edit the body — it gets overwritten each run.`
  );
  lines.push("");
  lines.push(`**Last checked:** \`${status.timestamp}\``);
  lines.push("");
  lines.push("## Current flags");
  for (const flag of status.flags) lines.push(`- ${flag}`);
  lines.push("");
  lines.push("## Snapshot");
  lines.push(
    `- Live newest news addedDate: \`${status.live.newestNewsAddedDate || "?"}\` (age: ${status.live.newestNewsAgeDays ?? "?"} days)`
  );
  lines.push(
    `- Live newest document addedDate: \`${status.live.newestDocAddedDate || "?"}\` (age: ${status.live.newestDocAgeDays ?? "?"} days)`
  );
  lines.push(
    `- Live weekly summary weekOf: \`${status.live.weeklySummaryWeekOf || "?"}\` (age: ${status.live.weeklySummaryAgeDays ?? "?"} days)`
  );
  lines.push(
    `- Repo HEAD newest news: \`${status.repo.newestNewsAddedDate || "?"}\``
  );
  lines.push(
    `- Repo HEAD newest document: \`${status.repo.newestDocAddedDate || "?"}\``
  );
  lines.push(
    `- Repo HEAD last ingest: \`${status.repo.ingestLastRunISO || "?"}\` (${status.repo.ingestAgeHours ?? "?"}h ago)`
  );
  lines.push("");
  lines.push("## What to check, in order");
  lines.push(
    `1. **Is auto-ingest committing?** Check recent \`chore: auto-ingest\` commits on \`main\`. If none in >48h, Vercel cron isn't firing (verify at Vercel Dashboard → Observability → Cron Jobs) or ingest is crashing (Vercel function logs).`
  );
  lines.push(
    `2. **Is the site fetching from repo?** Content is fetched at request time from \`raw.githubusercontent.com\` (see \`lib/content.ts\`). If \`live_lags_repo\` is flagged, either \`GITHUB_TOKEN\` in Vercel env is invalid (fetch 401s → empty fallback), or the Next.js fetch cache is stuck (revalidate=300; should recover within 5 min).`
  );
  lines.push(
    `3. **Is production serving stale HTML?** ISR page-level cache. \`revalidate=3600\` on the page + \`revalidate=300\` on the inner fetch means content should update within ~5 min. If it's stuck longer, force a redeploy from the Vercel dashboard.`
  );
  lines.push("");
  lines.push(
    `Closes automatically when the next scheduled check finds all flags cleared.`
  );
  return lines.join("\n");
}

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
