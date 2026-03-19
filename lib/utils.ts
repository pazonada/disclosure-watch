import { UAPDocument, UAPEvent, TimelineMilestone, NewsItem, DocumentCategory, DocumentSource, Importance } from "./types";

export interface SearchResult {
  type: "document" | "event" | "milestone" | "news";
  id: string;
  title: string;
  content: UAPDocument | UAPEvent | TimelineMilestone | NewsItem;
}

export interface GroupedSearchResults {
  documents: SearchResult[];
  events: SearchResult[];
  milestones: SearchResult[];
  news: SearchResult[];
  query: string;
}

/** Parse "YYYY-MM-DD" as a local date (avoids UTC-offset shifting the day). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "unknown") return "Date unknown";
  return parseLocalDate(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(dateStr: string): string {
  if (!dateStr || dateStr === "unknown") return "Date unknown";
  return parseLocalDate(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

export function sortByDate<T extends { date?: string; publishedDate?: string }>(
  items: T[],
  direction: "asc" | "desc" = "desc"
): T[] {
  return [...items].sort((a, b) => {
    const strA = a.publishedDate || a.date || "";
    const strB = b.publishedDate || b.date || "";
    // Push "unknown" dates to the end regardless of sort direction
    if (strA === "unknown" && strB !== "unknown") return 1;
    if (strB === "unknown" && strA !== "unknown") return -1;
    return direction === "desc" ? strB.localeCompare(strA) : strA.localeCompare(strB);
  });
}

export function filterDocuments(
  docs: UAPDocument[],
  filters: {
    category?: DocumentCategory;
    importance?: Importance;
    source?: DocumentSource;
    search?: string;
  }
): UAPDocument[] {
  return docs.filter((doc) => {
    if (filters.category && doc.category !== filters.category) return false;
    if (filters.importance && doc.importance !== filters.importance) return false;
    if (filters.source && doc.source !== filters.source) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });
}

export function importanceBadgeColor(importance: Importance): string {
  switch (importance) {
    case "High": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Medium": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Low": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

export function categoryIcon(category: UAPDocument["category"]): string {
  switch (category) {
    case "Report": return "📄";
    case "Hearing": return "🏛️";
    case "FOIA Release": return "🔓";
    case "Executive Order": return "📜";
    case "Official Statement": return "📰";
    case "Press Release": return "📰";
    case "Video": return "📺";
    case "Archive": return "🗄️";
    default: return "📄";
  }
}

export function sourceLabel(source: UAPDocument["source"]): string {
  switch (source) {
    case "AARO": return "AARO";
    case "Archives": return "National Archives";
    case "Congress": return "Congress";
    case "White House": return "White House";
    case "Department of Defense": return "Dept. of Defense";
    case "NASA": return "NASA";
    case "The Black Vault": return "The Black Vault";
    case "The Debrief": return "The Debrief";
    case "Manual": return "Editorial";
    default: return source;
  }
}

export function searchAllContent(
  query: string,
  documents: UAPDocument[],
  events: UAPEvent[],
  milestones: TimelineMilestone[],
  news: NewsItem[] = []
): GroupedSearchResults {
  const q = query.toLowerCase().trim();

  const documentResults = documents
    .filter((doc) => {
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .map((doc) => ({
      type: "document" as const,
      id: doc.id,
      title: doc.title,
      content: doc,
    }));

  const eventResults = events
    .filter((event) => {
      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q)
      );
    })
    .map((event) => ({
      type: "event" as const,
      id: event.id,
      title: event.title,
      content: event,
    }));

  const milestoneResults = milestones
    .filter((milestone) => {
      return (
        milestone.title.toLowerCase().includes(q) ||
        milestone.description.toLowerCase().includes(q)
      );
    })
    .map((milestone) => ({
      type: "milestone" as const,
      id: milestone.id,
      title: milestone.title,
      content: milestone,
    }));

  const newsResults = news
    .filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    })
    .map((item) => ({
      type: "news" as const,
      id: item.id,
      title: item.title,
      content: item,
    }));

  return {
    documents: documentResults,
    events: eventResults,
    milestones: milestoneResults,
    news: newsResults,
    query,
  };
}
