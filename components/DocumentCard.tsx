"use client";

import { UAPDocument } from "@/lib/types";
import { formatDate, sourceLabel } from "@/lib/utils";
import { CategoryIcon } from "./Icons";

interface Props {
  doc: UAPDocument;
  onCardClick?: (doc: UAPDocument) => void;
}

export default function DocumentCard({ doc, onCardClick }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    onCardClick?.(doc);
  };

  const importanceDot: Record<string, string> = {
    High: "bg-destructive",
    Medium: "bg-high",
    Low: "bg-green-500",
  };

  return (
    <article
      onClick={handleClick}
      className="group relative cursor-pointer flex flex-col rounded-lg border border-card-subtle p-5 transition-all hover:border-[var(--lime-30)] hover:bg-[var(--muted-30)]"
    >
      {/* Header: category + importance */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${importanceDot[doc.importance] || "bg-muted-foreground"}`} />
          <span className="inline-flex items-center rounded border border-border bg-[var(--muted-50)] px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {doc.category}
          </span>
        </div>
        <CategoryIcon category={doc.category} className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-lime transition-colors">
        {doc.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {doc.summary}
      </p>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-card-subtle space-y-2">
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span>Published {formatDate(doc.publishedDate)}</span>
          {doc.addedDate && doc.addedDate !== doc.publishedDate && (
            <span className="text-muted-foreground/60">· Released {formatDate(doc.addedDate)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground bg-[var(--muted-50)] px-2 py-0.5 rounded">
            {sourceLabel(doc.source)}
          </span>
          {doc.tags.filter((t) => t.toLowerCase() !== sourceLabel(doc.source).toLowerCase()).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono text-muted-foreground bg-[var(--muted-50)] px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Source link */}
      <div className="mt-3">
        <a
          href={doc.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[var(--lime-10)] px-3 py-1.5 text-xs font-medium text-lime transition-colors hover:bg-[rgba(198,215,81,0.2)]"
        >
          View Source →
        </a>
      </div>
    </article>
  );
}
