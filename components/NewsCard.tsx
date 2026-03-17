"use client";

import { NewsItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Newspaper, Video } from "./Icons";

interface Props {
  item: NewsItem;
}

export default function NewsCard({ item }: Props) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col rounded-lg border border-card-subtle p-5 transition-all hover:border-[var(--lime-30)] hover:bg-[var(--muted-30)]"
    >
      {/* Header: type badge + icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded border border-border bg-[var(--muted-50)] px-2 py-0.5 text-xs font-mono text-muted-foreground">
          {item.type === "video" ? "Video" : "Article"}
        </span>
        {item.type === "video" ? (
          <Video className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Newspaper className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-lime transition-colors">
        {item.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {item.description}
      </p>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-card-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {formatDate(item.publishedDate)}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-[var(--muted-50)] px-2 py-0.5 rounded">
              {item.source}
            </span>
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-lime transition-colors">
            ↗
          </span>
        </div>
      </div>
    </a>
  );
}
