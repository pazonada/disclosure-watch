"use client";

import { UAPEvent } from "@/lib/types";
import { formatDate, isUpcoming } from "@/lib/utils";
import { Clock, MapPin } from "./Icons";

interface Props {
  event: UAPEvent;
  onCardClick?: (event: UAPEvent) => void;
}

export default function EventCard({ event, onCardClick }: Props) {
  const upcoming = isUpcoming(event.date);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    onCardClick?.(event);
  };

  // Parse date for calendar badge
  const dateObj = new Date(event.date);
  const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" });
  const dayStr = dateObj.getDate().toString();

  return (
    <article
      onClick={handleClick}
      className="group relative cursor-pointer flex gap-4 rounded-lg border border-card-subtle p-5 transition-all hover:border-[var(--blue-30)] hover:bg-[var(--muted-30)]"
    >
      {/* Date badge */}
      <div className="flex-shrink-0">
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-[var(--blue-10)] border border-[rgba(0,133,245,0.2)]">
          <span className="text-xs font-mono text-blue uppercase">{monthStr}</span>
          <span className="text-xl font-bold text-foreground">{dayStr}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {upcoming && (
            <span className="inline-flex items-center rounded border border-[rgba(0,133,245,0.2)] bg-[var(--blue-5)] px-2 py-0.5 text-xs font-mono text-blue">
              Upcoming
            </span>
          )}
          <span className="inline-flex items-center rounded border border-border bg-[var(--muted-50)] px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {event.type}
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground leading-snug mb-2 group-hover:text-blue transition-colors line-clamp-2">
          {event.title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {event.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatDate(event.date)}
          </span>
          {event.committee && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {event.committee}
            </span>
          )}
        </div>

        {(event.videoUrl || event.transcriptUrl) && (
          <div className="mt-3 flex gap-2">
            {event.videoUrl && (
              <a
                href={event.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[var(--blue-10)] px-3 py-1.5 text-xs font-medium text-blue hover:bg-[rgba(0,133,245,0.2)]"
              >
                Watch ▶
              </a>
            )}
            {event.transcriptUrl && (
              <a
                href={event.transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[rgba(26,32,48,0.8)]"
              >
                Transcript
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
