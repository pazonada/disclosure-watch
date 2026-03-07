import documents from "@/content/documents.json";
import events from "@/content/events.json";
import milestones from "@/content/milestones.json";
import news from "@/content/news.json";
import weeklySummary from "@/content/weekly-summary.json";
import { UAPDocument, UAPEvent, TimelineMilestone, NewsItem, WeeklySummary } from "./types";

export function getDocuments(): UAPDocument[] {
  return documents as UAPDocument[];
}

export function getEvents(): UAPEvent[] {
  return events as UAPEvent[];
}

export function getMilestones(): TimelineMilestone[] {
  return milestones as TimelineMilestone[];
}

/** All documents excluding News and Video categories (actual government documents only). */
export function getOfficialDocuments(): UAPDocument[] {
  return getDocuments().filter(
    (d) => d.category !== "News" && d.category !== "Video"
  );
}

export function getDocumentById(id: string): UAPDocument | undefined {
  return getDocuments().find((d) => d.id === id);
}

export function getUpcomingEvents(): UAPEvent[] {
  const now = new Date();
  return getEvents()
    .filter((e) => new Date(e.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getPastEvents(): UAPEvent[] {
  const now = new Date();
  return getEvents()
    .filter((e) => new Date(e.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getNews(): NewsItem[] {
  return (news as NewsItem[]).sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
}

export function getWeeklySummary(): WeeklySummary {
  return weeklySummary as WeeklySummary;
}

/** Returns the latest N news items per source, sorted newest-first overall. */
export function getNewsBySource(perSource = 3): Record<string, NewsItem[]> {
  const all = getNews();
  const grouped: Record<string, NewsItem[]> = {};
  for (const item of all) {
    if (!grouped[item.source]) grouped[item.source] = [];
    if (grouped[item.source].length < perSource) {
      grouped[item.source].push(item);
    }
  }
  return grouped;
}
