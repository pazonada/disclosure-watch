/**
 * Pre-render grouping for alert emails.
 *
 * The National Archives bulk-releases FAA Washington Operation Center
 * "UAP activity" reports — short, mostly-redacted forms that share a
 * heavy boilerplate summary. When several land in the same email, the
 * default per-item rendering becomes a wall of near-identical cards
 * with no useful information.
 *
 * This module clusters those into a single "group" entry so the email
 * can render one shared explainer plus a compact list of the underlying
 * incidents (date, callsign, location, link).
 */

import type { AlertItem } from "./alert-email";
import { callClaude } from "./ai";

// ── Public types ──────────────────────────────────────────────────────────

export interface GroupedDoc {
  /** "Aug 21, 2023" */
  incidentDate: string;
  /** "NKS797" */
  callsign: string;
  /** "Picayune, MS" */
  location: string;
  /** "PQL" if present, else "" */
  airportCode: string;
  /** Link to the source record */
  url: string;
}

export interface DocumentGroup {
  type: "group";
  /** Headline shown at the top of the card */
  title: string;
  /** 2-3 sentence Claude-generated explainer of what these docs are */
  explainer: string;
  /** Sorted compact list of underlying incidents */
  docs: GroupedDoc[];
}

export type AlertEntry = AlertItem | DocumentGroup;

export function isDocumentGroup(entry: AlertEntry): entry is DocumentGroup {
  return entry.type === "group";
}

// ── Detection / extraction ────────────────────────────────────────────────

const FAA_TITLE_RE = /^([A-Z]{2,4}\d+)\s+UFO-UAP\s+ACTIVITY\s+(\d{2})-(\d{2})-(\d{4})/i;
// Matches "Topeka, Kansas (FOE) area" or "Orangeburg, South Carolina area"
const FAA_LOCATION_RE = /([A-Z][A-Za-z .'-]+),\s+([A-Z][A-Za-z ]+?)(?:\s+\(([A-Z]{3,4})\))?\s+area/;

const STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

function isFaaUapReport(item: AlertItem): boolean {
  if (item.type !== "document") return false;
  return FAA_TITLE_RE.test(item.title);
}

function parseIncidentDate(title: string): string | null {
  const m = title.match(FAA_TITLE_RE);
  if (!m) return null;
  const [, , mm, dd, yyyy] = m;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseCallsign(title: string): string {
  const m = title.match(FAA_TITLE_RE);
  return m ? m[1].toUpperCase() : "";
}

function parseLocation(summary: string): { location: string; airportCode: string } {
  const m = summary.match(FAA_LOCATION_RE);
  if (!m) return { location: "", airportCode: "" };
  const city = m[1].trim();
  const stateRaw = m[2].trim().toLowerCase();
  const stateAbbr = STATE_ABBR[stateRaw] || m[2].trim();
  return {
    location: `${city}, ${stateAbbr}`,
    airportCode: m[3] || "",
  };
}

// ── Group title heuristic ─────────────────────────────────────────────────

function buildGroupTitle(docs: GroupedDoc[]): string {
  const states = new Set(
    docs.map((d) => d.location.split(",").pop()?.trim()).filter(Boolean)
  );

  // Date range
  const sortedDates = docs
    .map((d) => new Date(d.incidentDate))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  let when = "";
  if (sortedDates.length > 0) {
    const earliest = fmt(sortedDates[0]);
    const latest = fmt(sortedDates[sortedDates.length - 1]);
    when = earliest === latest ? earliest : `${earliest}–${latest}`;
  }

  const stateList = Array.from(states).filter((s): s is string => Boolean(s));
  let where = "";
  if (stateList.length === 1) {
    where = stateList[0];
  } else if (stateList.length <= 3) {
    where = stateList.join(", ");
  } else {
    where = `${stateList.length} states`;
  }

  const parts = [`${docs.length} FAA UAP activity reports`];
  if (where) parts.push(where);
  if (when) parts.push(when);
  return parts.join(" · ");
}

// ── Explainer generation ──────────────────────────────────────────────────

const FALLBACK_EXPLAINER =
  "These are short FAA Washington Operation Center forms logging UAP sightings reported by commercial pilots and forwarded to the agency's UAP coordinator. The records were released by the National Archives. The actual incident details are typically redacted — what's publicly available is the cover page showing aircraft, location, and date.";

async function generateGroupExplainer(docs: GroupedDoc[]): Promise<string> {
  const sample = docs
    .slice(0, 4)
    .map((d) => `- ${d.callsign} near ${d.location}, ${d.incidentDate}`)
    .join("\n");

  const prompt = `You write the lead-in paragraph for a grouped block in the Disclosure Watch insider email. The audience is a curious, well-informed adult.

The block lists ${docs.length} FAA "Washington Operation Center" UAP activity reports that were released by the National Archives. Sample:
${sample}

TASK: Write 2-3 short sentences (max 60 words total) that tell the reader, in plain English:
1. What these documents actually are (FAA's UAP cover-sheet log, forwarded to a UAP coordinator)
2. What level of detail is publicly available — flag that the actual sighting narrative is usually redacted; what's released is the cover page (aircraft, location, date).
3. (Optional) Any pattern worth flagging in this batch (a single date cluster, a single carrier, a single region).

RULES:
- NEVER use em dashes (—). Use commas, colons, or restructure.
- No filler ("Notably", "It remains to be seen", "In a significant development")
- No marketing voice. Straight reporting.
- No emojis, no exclamation marks.

Reply with ONLY the paragraph. No quotes, no labels.`;

  const text = await callClaude(prompt, 200);
  // Enforce voice rule: no em dashes. Claude occasionally ignores the prompt.
  return (text || FALLBACK_EXPLAINER).replace(/\s*—\s*/g, ", ");
}

// ── Public entry point ────────────────────────────────────────────────────

/**
 * Convert a flat list of alert items into a list of render entries,
 * folding clusters of FAA WOC UAP activity reports into a single group.
 *
 * Triggers grouping only when 2+ qualifying reports are present;
 * single reports pass through as-is.
 */
export async function groupAlertItems(items: AlertItem[]): Promise<AlertEntry[]> {
  const faaIndices = items.flatMap((item, i) => (isFaaUapReport(item) ? [i] : []));

  if (faaIndices.length < 2) {
    return items.slice();
  }

  const docs: GroupedDoc[] = [];
  for (const i of faaIndices) {
    const item = items[i];
    const incidentDate = parseIncidentDate(item.title);
    const callsign = parseCallsign(item.title);
    const { location, airportCode } = parseLocation(item.summary);
    if (!incidentDate || !callsign) continue;
    docs.push({
      incidentDate,
      callsign,
      location,
      airportCode,
      url: item.url,
    });
  }

  if (docs.length < 2) {
    return items.slice();
  }

  // Sort docs newest incident first
  docs.sort(
    (a, b) =>
      new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
  );

  const explainer = await generateGroupExplainer(docs);
  const title = buildGroupTitle(docs);

  const group: DocumentGroup = {
    type: "group",
    title,
    explainer,
    docs,
  };

  // Replace the first FAA item position with the group; drop the rest.
  const faaSet = new Set(faaIndices);
  const out: AlertEntry[] = [];
  let inserted = false;
  for (let i = 0; i < items.length; i++) {
    if (faaSet.has(i)) {
      if (!inserted) {
        out.push(group);
        inserted = true;
      }
      // skip — absorbed into group
    } else {
      out.push(items[i]);
    }
  }
  return out;
}
