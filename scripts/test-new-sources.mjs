// One-off smoke test for the new Black Vault + Federal Register fetchers.
// Mirrors the filter logic in app/api/ingest/route.ts.

const UAP_RELEVANCE_KEYWORDS = [
  "uap", "ufo", "unidentified anomalous", "unidentified aerial",
  "anomalous phenomena", "flying object", "flying objects",
  "aaro", "all-domain anomaly resolution",
  "aatip", "aawsap", "advanced aerospace threat",
  "immaculate constellation", "yankee blue", "tic tac",
  "disclosure", "non-human intelligence", "nhi",
  "extraterrestrial", "roswell", "area 51",
  "grusch", "elizondo", "fravor", "graves",
];

function isUapRelevant(text) {
  const lower = text.toLowerCase();
  return UAP_RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

function isStrongUapDocMatch(text) {
  const lower = text.toLowerCase();
  if (lower.includes("unidentified anomalous phenomena")) return true;
  if (lower.includes("unidentified aerial phenomena")) return true;
  if (lower.includes("all-domain anomaly resolution")) return true;
  if (/\baaro\b/i.test(text)) return true;
  if (/\buap\b/i.test(text) && /\b(phenomena|disclosure|object|sighting|report|review|office|incident)\b/i.test(text)) return true;
  if (/\bufo\b/i.test(text) && /\b(disclosure|file|release|sighting|incident|report)\b/i.test(text)) return true;
  return false;
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘").replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ").trim();
}

function parseRssItems(xml) {
  const items = [];
  const matches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of matches.slice(0, 30)) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || "";
    const description = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    if (title && link) items.push({ title: stripHtml(title), link, description, pubDate });
  }
  return items;
}

async function testBlackVault() {
  console.log("\n=== Black Vault ===");
  const resp = await fetch("https://www.theblackvault.com/documentarchive/feed/", {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) { console.log("HTTP", resp.status); return; }
  const xml = await resp.text();
  const items = parseRssItems(xml);
  console.log(`Total items: ${items.length}`);
  let kept = 0, dropped = 0;
  for (const item of items) {
    const text = `${item.title} ${stripHtml(item.description)}`;
    if (isUapRelevant(text)) {
      kept++;
      console.log(`  ✓ ${item.pubDate.slice(0, 16).padEnd(16)} | ${item.title.slice(0, 90)}`);
    } else {
      dropped++;
      console.log(`  ✗ DROPPED: ${item.title.slice(0, 90)}`);
    }
  }
  console.log(`Kept ${kept} / ${items.length}, dropped ${dropped}`);
}

async function testFederalRegister() {
  console.log("\n=== Federal Register ===");
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const fromStr = fromDate.toISOString().slice(0, 10);

  for (const term of ["unidentified anomalous phenomena", "all-domain anomaly resolution"]) {
    console.log(`\n-- query: "${term}" --`);
    const url = "https://www.federalregister.gov/api/v1/documents.json" +
      `?per_page=50&order=newest` +
      `&conditions%5Bterm%5D=${encodeURIComponent(term)}` +
      `&conditions%5Bpublication_date%5D%5Bgte%5D=${fromStr}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) { console.log("HTTP", resp.status); continue; }
    const data = await resp.json();
    const total = data.count;
    const results = data.results || [];
    console.log(`API count: ${total}, returned: ${results.length}`);

    let kept = 0;
    for (const r of results) {
      const haystack = `${r.title || ""} ${r.abstract || ""}`;
      const strong = isStrongUapDocMatch(haystack);
      const agencyNames = (r.agencies || []).map((a) => a.name || a.raw_name).filter(Boolean);
      const isDoDOrODNI = agencyNames.some((n) =>
        /defense/i.test(n) || /national intelligence/i.test(n) || /executive office/i.test(n)
      );

      const pass = strong && isDoDOrODNI;
      const flag = pass ? "✓" : (strong ? "~" : "✗");
      console.log(`  ${flag} ${r.publication_date} | ${(agencyNames[0] || "?").slice(0, 24).padEnd(24)} | ${(r.title || "").slice(0, 70)}`);
      if (pass) kept++;
    }
    console.log(`Kept ${kept} / ${results.length}`);
  }
}

await testBlackVault();
await testFederalRegister();
