export interface WeeklySummary {
  weekOf: string;
  summary: string;
}

export type DocumentSource = "AARO" | "Archives" | "Congress" | "White House" | "Department of Defense" | "NASA" | "The Black Vault" | "The Debrief" | "Manual";
export type DocumentCategory = "Report" | "Hearing" | "FOIA Release" | "Executive Order" | "Official Statement" | "Press Release" | "Video" | "Archive";
export type Importance = "High" | "Medium" | "Low";
export type EventType = "Hearing" | "Deadline" | "Conference" | "Press Conference" | "Legislation" | "Investigation" | "Agency Update" | "Advocacy" | "Document Release" | "Classified Briefing";
export type MilestoneImportance = "High" | "Medium" | "Low";

export interface UAPDocument {
  id: string;
  title: string;
  source: DocumentSource;
  sourceUrl: string;
  documentUrl?: string;
  summary: string;
  /** Longer summary shown in the lightbox modal. Falls back to `summary` if absent. */
  expandedSummary?: string;
  /** Key points / stats shown as bullets in the lightbox modal. */
  keyPoints?: string[];
  category: DocumentCategory;
  importance: Importance;
  tags: string[];
  publishedDate: string;
  addedDate: string;
}

export interface UAPEvent {
  id: string;
  title: string;
  description: string;
  /** Longer description shown in the lightbox modal. Falls back to `description` if absent. */
  expandedDescription?: string;
  /** Key points shown as bullets in the lightbox modal. */
  keyPoints?: string[];
  date: string;
  type: EventType;
  committee?: string;
  sourceUrl: string;
  transcriptUrl?: string;
  videoUrl?: string;
}

export interface TimelineMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  importance: MilestoneImportance;
}

export type NewsSource = string;
export type NewsType = "article" | "video";

export interface NewsItem {
  id: string;
  title: string;
  source: NewsSource;
  url: string;
  description: string;
  publishedDate: string;
  /** Date the item was ingested (ISO date string, e.g. "2026-04-11"). */
  addedDate?: string;
  type: NewsType;
  /** YouTube embed URL (e.g., https://www.youtube.com/embed/XXXXX). Only for type: "video". */
  embedUrl?: string;
}
