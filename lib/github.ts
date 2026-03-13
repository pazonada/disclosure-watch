/**
 * GitHub API helpers for committing content updates.
 *
 * After the ingest pipeline fetches and merges new content, this module
 * commits the updated JSON files back to the repo in a single atomic
 * commit, which triggers a Vercel redeployment with fresh data.
 *
 * Environment variables:
 *   GITHUB_TOKEN  — fine-grained PAT with Contents: Read & Write
 *   GITHUB_REPO   — e.g. "pazonada/disclosure-watch"
 */

const GITHUB_API = "https://api.github.com";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return token;
}

function getRepo(): { owner: string; repo: string } {
  const repoStr = process.env.GITHUB_REPO;
  if (!repoStr) throw new Error("GITHUB_REPO not set");
  const [owner, repo] = repoStr.split("/");
  return { owner, repo };
}

async function githubRequest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown
): Promise<any> {
  const resp = await fetch(`${GITHUB_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub ${method} ${endpoint}: ${resp.status} ${err}`);
  }

  return resp.json();
}

export interface FileUpdate {
  /** Repo-relative path, e.g. "content/documents.json" */
  path: string;
  /** File content as a UTF-8 string */
  content: string;
}

/**
 * Commits multiple files to the repo in a single atomic commit
 * using the Git Trees API. Returns the new commit SHA.
 */
export async function commitFiles(
  files: FileUpdate[],
  message: string,
  branch = "main"
): Promise<string> {
  if (files.length === 0) return "";

  const { owner, repo } = getRepo();

  // 1. Get the latest commit SHA on the branch
  const ref = await githubRequest(
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`
  );
  const latestCommitSha: string = ref.object.sha;

  // 2. Get the tree SHA of the latest commit
  const commit = await githubRequest(
    `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`
  );
  const baseTreeSha: string = commit.tree.sha;

  // 3. Create blobs for each file
  const treeItems = [];
  for (const file of files) {
    const blob = await githubRequest(
      `/repos/${owner}/${repo}/git/blobs`,
      "POST",
      { content: file.content, encoding: "utf-8" }
    );
    treeItems.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  // 4. Create a new tree
  const tree = await githubRequest(
    `/repos/${owner}/${repo}/git/trees`,
    "POST",
    { base_tree: baseTreeSha, tree: treeItems }
  );

  // 5. Create a new commit
  const newCommit = await githubRequest(
    `/repos/${owner}/${repo}/git/commits`,
    "POST",
    { message, tree: tree.sha, parents: [latestCommitSha] }
  );

  // 6. Update the branch reference
  await githubRequest(
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    "PATCH",
    { sha: newCommit.sha }
  );

  return newCommit.sha;
}
