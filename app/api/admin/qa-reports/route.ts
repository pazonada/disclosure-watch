import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "pazonada";
const GITHUB_REPO_NAME =
  (process.env.GITHUB_REPO || "pazonada/disclosure-watch").split("/").pop() ||
  "disclosure-watch";
const GITHUB_BRANCH = "main";

/**
 * GET /api/admin/qa-reports
 *
 * Lists all QA report files, or returns the content of a specific report
 * if ?file=<filename> is provided. Reads from GitHub HEAD rather than the
 * deployment fs — content commits skip Vercel builds, so fs would show a
 * stale directory listing.
 */

interface GitHubContentEntry {
  name: string;
  type: string;
  size: number;
  download_url: string | null;
}

async function ghHeaders(): Promise<Record<string, string>> {
  const token = process.env.GITHUB_TOKEN;
  const base: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  // Return a specific report's content
  if (file) {
    const safeName = file.replace(/[^A-Za-z0-9_.-]/g, "");
    if (!safeName || !safeName.endsWith(".md")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }
    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/content/qa-reports/${safeName}`;
    try {
      const resp = await fetch(url, {
        headers: await ghHeaders(),
        cache: "no-store",
      });
      if (!resp.ok) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const content = await resp.text();
      return NextResponse.json({ file: safeName, content });
    } catch (err) {
      console.error("QA report fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
    }
  }

  // List all reports via GitHub contents API
  const listUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/contents/content/qa-reports?ref=${GITHUB_BRANCH}`;
  try {
    const resp = await fetch(listUrl, {
      headers: await ghHeaders(),
      cache: "no-store",
    });
    if (resp.status === 404) {
      return NextResponse.json({ reports: [] });
    }
    if (!resp.ok) {
      return NextResponse.json(
        { error: `GitHub API ${resp.status}` },
        { status: 500 }
      );
    }
    const entries = (await resp.json()) as GitHubContentEntry[];
    const reports = entries
      .filter((e) => e.type === "file" && e.name.endsWith(".md"))
      .sort((a, b) => b.name.localeCompare(a.name)) // filenames are date-prefixed
      .map((e) => {
        // Extract YYYY-MM-DD from filename (e.g. "audit-ALERT-2026-05-06.md")
        const dateMatch = e.name.match(/(\d{4}-\d{2}-\d{2})/);
        const modified = dateMatch
          ? new Date(dateMatch[1]).toISOString()
          : new Date(0).toISOString();
        return {
          file: e.name,
          size: e.size,
          modified,
          isAlert: e.name.includes("ALERT"),
        };
      });
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("QA reports list error:", err);
    return NextResponse.json({ error: "Failed to list reports" }, { status: 500 });
  }
}
