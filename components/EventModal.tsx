"use client";

import { useEffect, useCallback } from "react";
import { UAPEvent } from "@/lib/types";
import { formatDateLong, isUpcoming } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "./Icons";

interface Props {
  event: UAPEvent;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function EventModal({ event, onClose, onPrev, onNext }: Props) {
  const upcoming = isUpcoming(event.date);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const displayDescription = event.expandedDescription || event.description;
  const keyPoints = event.keyPoints || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleBackdropClick}
    >
      {/* Prev arrow */}
      {onPrev && (
        <button
          onClick={onPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-50 rounded-full bg-card/80 border border-card-subtle p-2 text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:scale-110 sm:left-5"
          aria-label="Previous event"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      )}

      {/* Next arrow */}
      {onNext && (
        <button
          onClick={onNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-50 rounded-full bg-card/80 border border-card-subtle p-2 text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:scale-110 sm:right-5"
          aria-label="Next event"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>
      )}

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-card-subtle bg-card p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--muted-30)] rounded-lg p-2"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top row: type + status */}
        <div className="mb-5 flex items-center gap-3 pr-12">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {event.type}
          </span>
          {upcoming && (
            <span className="rounded-full bg-[var(--lime-10)] px-2.5 py-0.5 text-xs font-medium text-lime">
              Upcoming
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-4 text-2xl font-bold leading-tight text-foreground">
          {event.title}
        </h2>

        {/* Date */}
        <div className="mb-6 text-sm text-muted-foreground font-mono">
          <span>{formatDateLong(event.date)}</span>
        </div>

        {/* Expanded description */}
        <div className="mb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displayDescription}
          </p>
        </div>

        {/* Key points */}
        {keyPoints.length > 0 && (
          <div className="mb-8 rounded-xl border border-card-subtle bg-[var(--muted-30)] p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Key points
            </h3>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground font-light">
                  <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-lime" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-lime px-4 py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-[var(--lime-30)] hover:text-foreground"
          >
            View Source →
          </a>
          {event.videoUrl && (
            <a
              href={event.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--lime-30)] bg-[var(--lime-10)] px-4 py-3 text-center text-sm font-semibold text-lime transition-colors hover:bg-[var(--lime-30)]"
            >
              Watch ▶
            </a>
          )}
          {event.transcriptUrl && (
            <a
              href={event.transcriptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-card-subtle bg-[var(--muted-30)] px-4 py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Transcript
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
