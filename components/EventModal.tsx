"use client";

import { useEffect } from "react";
import { UAPEvent } from "@/lib/types";
import { formatDateLong, isUpcoming } from "@/lib/utils";

interface Props {
  event: UAPEvent;
  onClose: () => void;
}

export default function EventModal({ event, onClose }: Props) {
  const upcoming = isUpcoming(event.date);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-850 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 transition-colors hover:text-white hover:bg-slate-800 rounded-lg p-2"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top row: type + status */}
        <div className="mb-5 flex items-center gap-3 pr-12">
          <span className="text-2xl">🏛️</span>
          <span className="text-sm font-medium uppercase tracking-widest text-slate-400">
            {event.type}
          </span>
          {upcoming && (
            <span className="rounded-full bg-accent-cyan/20 px-2.5 py-0.5 text-xs font-medium text-accent-cyan">
              Upcoming
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-4 text-3xl font-bold leading-tight text-white">
          {event.title}
        </h2>

        {/* Date */}
        <div className="mb-6 text-sm text-slate-400">
          <span className="font-medium text-slate-300">{formatDateLong(event.date)}</span>
        </div>

        {/* Expanded description */}
        <div className="mb-6">
          <p className="text-base leading-relaxed text-slate-300">
            {displayDescription}
          </p>
        </div>

        {/* Key points */}
        {keyPoints.length > 0 && (
          <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Key points
            </h3>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
                  <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-cyan" />
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
            className="flex-1 rounded-lg bg-accent-blue px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-blue/90"
          >
            View Source →
          </a>
          {event.videoUrl && (
            <a
              href={event.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-center text-sm font-semibold text-accent-blue transition-colors hover:bg-accent-blue/20"
            >
              Watch ▶
            </a>
          )}
          {event.transcriptUrl && (
            <a
              href={event.transcriptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Transcript
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
