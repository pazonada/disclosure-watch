import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { supabase } from "@/lib/supabase";
import { getIngestMeta } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/health-check
 *
 * Runs daily via Vercel cron. Checks:
 *   1. Content freshness — have documents/news been updated recently?
 *   2. Cron health — is /api/ingest responding?
 *   3. Weekly summary freshness — is it from the current week?
 *   4. GitHub commit recency — has the repo been updated?
 *
 * If ANY check fails, sends an alert email to ALERT_EMAIL (falls back
 * to the admin sending a self-notification via Resend).
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://disclosurewatch.com";

// ── Individual checks ──────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
}

/**
 * Check that the ingest pipeline has run recently by reading
 * ingest-meta.json (which the ingest workflow commits after every
 * successful run) from GitHub raw. Content is no longer bundled at
 * build time, so fs reads would be stuck at the last non-content
 * deploy — GitHub raw gives us the live value within the 5-min
 * fetch-cache window.
 */
async function checkContentFreshness(): Promise<CheckResult> {
  try {
    const meta = await getIngestMeta();

    if (meta.lastSuccessfulRun) {
      const hoursSinceRun = Math.floor(
        (Date.now() - new Date(meta.lastSuccessfulRun).getTime()) / (1000 * 60 * 60)
      );

      if (hoursSinceRun > 48) {
        return {
          name: "Content freshness",
          status: "error",
          message: `Ingest last ran ${Math.floor(hoursSinceRun / 24)} days ago. Pipeline may be broken.`,
        };
      }
      if (hoursSinceRun > 26) {
        return {
          name: "Content freshness",
          status: "warn",
          message: `Ingest last ran ${hoursSinceRun} hours ago (expected every 24h).`,
        };
      }
      return {
        name: "Content freshness",
        status: "ok",
        message: `Ingest last ran ${hoursSinceRun} hour(s) ago.`,
      };
    }

    // Fallback: if ingest-meta.json is missing, check content dates
    const newsResp = await fetch(`${SITE_URL}/api/news`, {
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

    if (newsResp && newsResp.ok) {
      const news = (await newsResp.json()) as Array<{
        addedDate?: string;
        publishedDate?: string;
      }>;
      const latestDate = news.reduce((latest, item) => {
        const d = item.addedDate || item.publishedDate || "";
        return d > latest ? d : latest;
      }, "");

      if (latestDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          name: "Content freshness",
          status: daysSince > 7 ? "error" : daysSince > 3 ? "warn" : "ok",
          message: `Latest content: ${latestDate} (${daysSince} day(s) ago). No ingest-meta.json available.`,
        };
      }
    }

    return {
      name: "Content freshness",
      status: "warn",
      message: "Could not determine content freshness.",
    };
  } catch (err) {
    return {
      name: "Content freshness",
      status: "error",
      message: `Failed to check: ${err}`,
    };
  }
}

/** Check that the ingest endpoint is reachable and authenticated */
async function checkIngestEndpoint(): Promise<CheckResult> {
  try {
    // Just check that the endpoint is reachable (don't actually run ingest)
    const resp = await fetch(`${SITE_URL}/api/ingest`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });

    // 401 means auth is working (it rejected us without a token) — that's fine
    if (resp.status === 401) {
      return {
        name: "Ingest endpoint",
        status: "ok",
        message: "Endpoint reachable, auth is enforced.",
      };
    }

    // Any other non-200 is unexpected
    if (!resp.ok) {
      return {
        name: "Ingest endpoint",
        status: "warn",
        message: `Endpoint returned unexpected status ${resp.status}`,
      };
    }

    return {
      name: "Ingest endpoint",
      status: "ok",
      message: "Endpoint reachable and responding.",
    };
  } catch (err) {
    return {
      name: "Ingest endpoint",
      status: "error",
      message: `Ingest endpoint unreachable: ${err}`,
    };
  }
}

/** Check the latest GitHub commit to see if auto-ingest has been committing */
async function checkGitHubCommits(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return {
      name: "GitHub commits",
      status: "warn",
      message: "GITHUB_TOKEN or GITHUB_REPO not set, cannot check.",
    };
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repo}/commits?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!resp.ok) {
      return {
        name: "GitHub commits",
        status: "error",
        message: `GitHub API returned ${resp.status}`,
      };
    }

    const commits = (await resp.json()) as Array<{
      sha: string;
      commit: { message: string; committer: { date: string } };
    }>;

    // Find the most recent auto-ingest commit
    const autoIngest = commits.find((c) =>
      c.commit.message.startsWith("chore: auto-ingest")
    );

    if (!autoIngest) {
      // Check how old the most recent commit is
      const lastCommitDate = commits[0]?.commit?.committer?.date;
      const daysSince = lastCommitDate
        ? Math.floor(
            (Date.now() - new Date(lastCommitDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : -1;

      return {
        name: "GitHub commits",
        status: daysSince > 7 ? "error" : "warn",
        message: `No auto-ingest commits in last 10 commits. Last commit ${daysSince} day(s) ago.`,
      };
    }

    const ingestDate = autoIngest.commit.committer.date;
    const daysSinceIngest = Math.floor(
      (Date.now() - new Date(ingestDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceIngest > 7) {
      return {
        name: "GitHub commits",
        status: "error",
        message: `Last auto-ingest was ${daysSinceIngest} days ago. Cron may be failing.`,
      };
    }
    if (daysSinceIngest > 3) {
      return {
        name: "GitHub commits",
        status: "warn",
        message: `Last auto-ingest was ${daysSinceIngest} days ago.`,
      };
    }

    return {
      name: "GitHub commits",
      status: "ok",
      message: `Last auto-ingest ${daysSinceIngest} day(s) ago: "${autoIngest.commit.message}"`,
    };
  } catch (err) {
    return {
      name: "GitHub commits",
      status: "error",
      message: `GitHub check failed: ${err}`,
    };
  }
}

/** Check that the weekly summary is from the current or previous week */
async function checkWeeklySummary(): Promise<CheckResult> {
  try {
    const resp = await fetch(`${SITE_URL}/api/weekly-summary`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (resp.status === 404) {
      // Endpoint may not exist — fall back to checking content directly
      return {
        name: "Weekly summary",
        status: "ok",
        message: "Skipped (no /api/weekly-summary endpoint).",
      };
    }

    if (!resp.ok) {
      return {
        name: "Weekly summary",
        status: "warn",
        message: `Weekly summary API returned ${resp.status}`,
      };
    }

    const data = (await resp.json()) as { weekOf?: string };
    if (!data.weekOf) {
      return {
        name: "Weekly summary",
        status: "warn",
        message: "No weekOf date in summary.",
      };
    }

    const daysSince = Math.floor(
      (Date.now() - new Date(data.weekOf).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince > 9) {
      return {
        name: "Weekly summary",
        status: "error",
        message: `Summary is ${daysSince} days old (weekOf: ${data.weekOf}). Should regenerate every Monday.`,
      };
    }
    if (daysSince > 7) {
      return {
        name: "Weekly summary",
        status: "warn",
        message: `Summary is ${daysSince} days old (weekOf: ${data.weekOf}). Expected refresh on Monday.`,
      };
    }

    return {
      name: "Weekly summary",
      status: "ok",
      message: `Summary is current (weekOf: ${data.weekOf}).`,
    };
  } catch (err) {
    return {
      name: "Weekly summary",
      status: "warn",
      message: `Could not check weekly summary: ${err}`,
    };
  }
}

// ── Supabase keep-alive ───────────────────────────────────────────────────

/**
 * Ping Supabase with a trivial query so the free-tier project
 * doesn't get auto-paused for inactivity (7-day threshold).
 */
async function pingSupabase(): Promise<CheckResult> {
  try {
    const { error } = await supabase.from("subscribers").select("id").limit(1);
    if (error) {
      return {
        name: "Supabase",
        status: "warn",
        message: `Keep-alive ping failed: ${error.message}`,
      };
    }
    return {
      name: "Supabase",
      status: "ok",
      message: "Keep-alive ping succeeded.",
    };
  } catch (err) {
    return {
      name: "Supabase",
      status: "warn",
      message: `Keep-alive ping error: ${err}`,
    };
  }
}

// ── Auto-retry ingest ─────────────────────────────────────────────────────

/**
 * If any check suggests the ingest is stale, automatically re-trigger it.
 * This acts as a self-healing mechanism so a single failed cron run
 * doesn't leave the site stale until someone manually intervenes.
 */
async function autoRetryIngest(): Promise<string> {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return "skipped (no INGEST_SECRET)";

  try {
    const resp = await fetch(`${SITE_URL}/api/ingest`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(110_000), // just under the 120s maxDuration
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return `failed (${resp.status}): ${text.slice(0, 100)}`;
    }

    const data = (await resp.json()) as Record<string, unknown>;
    return `success — ${JSON.stringify(data).slice(0, 200)}`;
  } catch (err) {
    return `error: ${err}`;
  }
}

// ── Alert email ────────────────────────────────────────────────────────────

function buildHealthAlertHtml(results: CheckResult[]): string {
  const rows = results
    .map((r) => {
      const icon =
        r.status === "ok" ? "&#9989;" : r.status === "warn" ? "&#9888;&#65039;" : "&#10060;";
      const color =
        r.status === "ok" ? "#22c55e" : r.status === "warn" ? "#eab308" : "#ef4444";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;">${icon}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;font-weight:600;color:${color};">${r.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;color:#b0b0c0;">${r.message}</td>
      </tr>`;
    })
    .join("");

  return `
  <div style="background:#0f0f1a;padding:32px;font-family:system-ui,-apple-system,sans-serif;color:#e0e0e0;">
    <h1 style="color:#ef4444;font-size:22px;margin:0 0 8px;">&#9888; Disclosure Watch — Health Alert</h1>
    <p style="color:#9090a0;margin:0 0 24px;">One or more health checks reported issues.</p>
    <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#12122a;">
        <th style="padding:10px 12px;text-align:left;color:#7070a0;font-size:12px;text-transform:uppercase;">Status</th>
        <th style="padding:10px 12px;text-align:left;color:#7070a0;font-size:12px;text-transform:uppercase;">Check</th>
        <th style="padding:10px 12px;text-align:left;color:#7070a0;font-size:12px;text-transform:uppercase;">Details</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#6060a0;font-size:12px;margin:24px 0 0;">Sent by the Disclosure Watch health monitor.</p>
  </div>`;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth — same pattern as other cron routes
  const secret = process.env.INGEST_SECRET;
  const cronSecret = request.headers.get("x-vercel-cron-secret") || "";

  if (secret && cronSecret !== secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Run checks in parallel. We intentionally dropped the GitHub-commits and
  // weekly-summary HTTP checks — they were giving false positives (the GitHub
  // API sometimes returned stale commit lists, and the weekly-summary check
  // hit a live endpoint that was ISR-cached). Content freshness via
  // ingest-meta.json is the authoritative signal: the ingest writes that file
  // every run, so if it's fresh, the pipeline is alive. pingSupabase doubles
  // as the free-tier keep-alive.
  let results: CheckResult[] = await Promise.all([
    checkContentFreshness(),
    checkIngestEndpoint(),
    pingSupabase(),
  ]);

  // Auto-retry: only if the pipeline itself hasn't run (error status, not warn)
  let retryResult = "";
  const contentStale = results.some(
    (r) => r.name === "Content freshness" && r.status === "error"
  );
  if (contentStale) {
    console.log("[HealthCheck] Stale content detected — auto-retrying ingest...");
    retryResult = await autoRetryIngest();
    console.log("[HealthCheck] Auto-retry result:", retryResult);

    // Re-run checks after retry to see if things improved
    if (retryResult.startsWith("success")) {
      results = await Promise.all([
        checkContentFreshness(),
        checkIngestEndpoint(),
        pingSupabase(),
      ]);
    }
  }

  const finalHasErrors = results.some((r) => r.status === "error");
  const finalHasWarnings = results.some((r) => r.status === "warn");

  // Send alert email only if issues persist AFTER auto-retry
  let emailed = false;
  if (finalHasErrors || finalHasWarnings) {
    const alertEmail = process.env.ALERT_EMAIL;
    if (alertEmail) {
      try {
        const severity = finalHasErrors ? "errors" : "warnings";
        const retryNote = retryResult
          ? `\n<p style="color:#9090a0;font-size:13px;margin:8px 0 0;">Auto-retry was attempted: ${retryResult.slice(0, 100)}</p>`
          : "";
        await sendEmail({
          to: alertEmail,
          subject: `[Disclosure Watch] Health check: ${severity} detected`,
          html: buildHealthAlertHtml(results) + retryNote,
        });
        emailed = true;
      } catch (err) {
        console.error("Failed to send health alert email:", err);
      }
    }
  }

  return NextResponse.json({
    ok: !finalHasErrors,
    checks: results,
    retried: contentStale,
    retryResult: retryResult || undefined,
    emailed,
    timestamp: new Date().toISOString(),
  });
}
