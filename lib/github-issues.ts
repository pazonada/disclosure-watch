/**
 * Minimal GitHub Issues client — used by the email-pipeline monitor to surface
 * failures without sending you email. Same idea as PagerDuty/Healthchecks but
 * routed through GitHub's notification system, which you already use and can
 * configure independently of this app.
 *
 * The monitor uses one labelled issue as a stateful flag: it opens an issue
 * the first time something breaks, edits the body each subsequent broken
 * check, and closes the issue when the pipeline recovers.
 *
 * Env vars:
 *   GITHUB_TOKEN   — fine-grained PAT with `Issues: Read and write` on the repo
 *   GITHUB_OWNER   — defaults to "pazonada"
 *   GITHUB_REPO    — defaults to "disclosure-watch"
 */

const API = "https://api.github.com";

interface GitHubIssue {
  number: number;
  state: "open" | "closed";
  title: string;
  body: string | null;
  html_url: string;
}

function getRepo(): { owner: string; repo: string; token: string } {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return {
    owner: process.env.GITHUB_OWNER || "pazonada",
    repo: process.env.GITHUB_REPO || "disclosure-watch",
    token,
  };
}

async function gh<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const { token } = getRepo();
  const resp = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`GitHub ${method} ${path} → ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

/** Find an open issue carrying the given label. Returns the first match or null. */
export async function findOpenIssueByLabel(label: string): Promise<GitHubIssue | null> {
  const { owner, repo } = getRepo();
  const issues = await gh<GitHubIssue[]>(
    "GET",
    `/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=5`
  );
  return issues[0] || null;
}

export async function createIssue(args: {
  title: string;
  body: string;
  labels: string[];
}): Promise<GitHubIssue> {
  const { owner, repo } = getRepo();
  return gh<GitHubIssue>("POST", `/repos/${owner}/${repo}/issues`, args);
}

export async function updateIssueBody(
  number: number,
  body: string
): Promise<GitHubIssue> {
  const { owner, repo } = getRepo();
  return gh<GitHubIssue>("PATCH", `/repos/${owner}/${repo}/issues/${number}`, { body });
}

export async function commentOnIssue(number: number, body: string): Promise<void> {
  const { owner, repo } = getRepo();
  await gh<unknown>("POST", `/repos/${owner}/${repo}/issues/${number}/comments`, { body });
}

export async function closeIssue(number: number): Promise<GitHubIssue> {
  const { owner, repo } = getRepo();
  return gh<GitHubIssue>("PATCH", `/repos/${owner}/${repo}/issues/${number}`, {
    state: "closed",
    state_reason: "completed",
  });
}
