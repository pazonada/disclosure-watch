/**
 * Link Validation Script
 *
 * Checks all sourceUrl and documentUrl links in documents.json, events.json,
 * and news.json for dead/broken URLs.
 *
 * Usage:
 *   npx tsx scripts/validate-links.ts
 *   npx tsx scripts/validate-links.ts --fix   # removes entries with dead links
 *
 * Reports:
 *   ✓ URL is reachable (2xx or 3xx response)
 *   ✗ URL is dead (4xx, 5xx, or network error)
 *   ? URL timed out or could not be checked
 */

import * as fs from "fs";
import * as path from "path";

const CONTENT_DIR = path.resolve(__dirname, "../content");
const TIMEOUT_MS = 10000;

interface LinkCheck {
  file: string;
  id: string;
  field: string;
  url: string;
  status: "ok" | "dead" | "timeout" | "error";
  statusCode?: number;
  error?: string;
}

async function checkUrl(url: string): Promise<{ status: "ok" | "dead" | "timeout" | "error"; statusCode?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "DisclosureWatch-LinkChecker/1.0",
      },
    });

    clearTimeout(timer);

    if (resp.ok || (resp.status >= 300 && resp.status < 400)) {
      return { status: "ok", statusCode: resp.status };
    }

    // Some servers reject HEAD requests — try GET
    if (resp.status === 403 || resp.status === 405 || resp.status === 406) {
      const getResp = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "DisclosureWatch-LinkChecker/1.0",
        },
      });
      if (getResp.ok) {
        return { status: "ok", statusCode: getResp.status };
      }
      return { status: "dead", statusCode: getResp.status };
    }

    return { status: "dead", statusCode: resp.status };
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.code === "ABORT_ERR") {
      return { status: "timeout" };
    }
    return { status: "error", error: err?.message || String(err) };
  }
}

async function main() {
  const fixMode = process.argv.includes("--fix");

  console.log(`\n🔗 Disclosure Watch — Link Validator`);
  console.log(`   Mode: ${fixMode ? "FIX (will flag dead links)" : "CHECK ONLY"}\n`);

  const results: LinkCheck[] = [];

  // Check documents.json
  const docsPath = path.join(CONTENT_DIR, "documents.json");
  const docs = JSON.parse(fs.readFileSync(docsPath, "utf-8"));
  console.log(`Checking ${docs.length} documents...`);

  for (const doc of docs) {
    for (const field of ["sourceUrl", "documentUrl"]) {
      const url = doc[field];
      if (!url) continue;

      const result = await checkUrl(url);
      const check: LinkCheck = {
        file: "documents.json",
        id: doc.id,
        field,
        url,
        ...result,
      };
      results.push(check);

      const icon = result.status === "ok" ? "✓" : result.status === "dead" ? "✗" : "?";
      const code = result.statusCode ? ` (${result.statusCode})` : "";
      if (result.status !== "ok") {
        console.log(`  ${icon} [${doc.id}] ${field}${code}: ${url}`);
      }
    }
  }

  // Check events.json
  const eventsPath = path.join(CONTENT_DIR, "events.json");
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  console.log(`Checking ${events.length} events...`);

  for (const event of events) {
    for (const field of ["sourceUrl", "videoUrl", "transcriptUrl"]) {
      const url = event[field];
      if (!url) continue;

      const result = await checkUrl(url);
      const check: LinkCheck = {
        file: "events.json",
        id: event.id,
        field,
        url,
        ...result,
      };
      results.push(check);

      const icon = result.status === "ok" ? "✓" : result.status === "dead" ? "✗" : "?";
      const code = result.statusCode ? ` (${result.statusCode})` : "";
      if (result.status !== "ok") {
        console.log(`  ${icon} [${event.id}] ${field}${code}: ${url}`);
      }
    }
  }

  // Check news.json
  const newsPath = path.join(CONTENT_DIR, "news.json");
  const news = JSON.parse(fs.readFileSync(newsPath, "utf-8"));
  console.log(`Checking ${news.length} news items...`);

  for (const item of news) {
    const result = await checkUrl(item.url);
    const check: LinkCheck = {
      file: "news.json",
      id: item.id,
      field: "url",
      url: item.url,
      ...result,
    };
    results.push(check);

    const icon = result.status === "ok" ? "✓" : result.status === "dead" ? "✗" : "?";
    const code = result.statusCode ? ` (${result.statusCode})` : "";
    if (result.status !== "ok") {
      console.log(`  ${icon} [${item.id}] url${code}: ${item.url}`);
    }
  }

  // Summary
  const ok = results.filter((r) => r.status === "ok").length;
  const dead = results.filter((r) => r.status === "dead").length;
  const timeout = results.filter((r) => r.status === "timeout").length;
  const error = results.filter((r) => r.status === "error").length;

  console.log(`\n── Summary ──`);
  console.log(`  Total links checked: ${results.length}`);
  console.log(`  ✓ OK: ${ok}`);
  console.log(`  ✗ Dead: ${dead}`);
  console.log(`  ? Timeout: ${timeout}`);
  console.log(`  ! Error: ${error}`);

  if (dead > 0) {
    console.log(`\n── Dead Links ──`);
    for (const r of results.filter((r) => r.status === "dead")) {
      console.log(`  [${r.file}] ${r.id}.${r.field} → ${r.statusCode} ${r.url}`);
    }
  }

  if (dead === 0 && error === 0 && timeout === 0) {
    console.log(`\n✅ All links are valid!`);
  }

  process.exit(dead > 0 ? 1 : 0);
}

main().catch(console.error);
