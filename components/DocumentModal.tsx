"use client";

import { useEffect } from "react";
import { UAPDocument } from "@/lib/types";
import { formatDateLong, importanceBadgeColor, categoryIcon } from "@/lib/utils";
import TagPill from "./TagPill";

interface Props {
  doc: UAPDocument;
  onClose: () => void;
}

export default function DocumentModal({ doc, onClose }: Props) {
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

  // Use expandedSummary if available, otherwise fall back to summary
  const displaySummary = doc.expandedSummary || doc.summary;
  const keyPoints = doc.keyPoints || [];

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

        {/* Top row: category + importance */}
        <div className="mb-5 flex items-center justify-between pr-12">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcon(doc.category)}</span>
            <span className="text-sm font-medium uppercase tracking-widest text-slate-400">
              {doc.category}
            </span>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${importanceBadgeColor(doc.importance)}`}
          >
            {doc.importance}
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-6 text-3xl font-bold leading-tight text-white">
          {doc.title}
        </h2>

        {/* Expanded summary */}
        <div className="mb-6">
          <p className="text-base leading-relaxed text-slate-300">
            {displaySummary}
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
                  <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-blue" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Date */}
        <div className="mb-8 text-sm text-slate-400">
          <span>{formatDateLong(doc.publishedDate)}</span>
        </div>

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-accent-blue px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-blue/90"
          >
            View Source →
          </a>
          {doc.documentUrl && (
            <a
              href={doc.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              View Document ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
