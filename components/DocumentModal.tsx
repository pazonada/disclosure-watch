"use client";

import { useEffect } from "react";
import { UAPDocument } from "@/lib/types";
import { formatDateLong } from "@/lib/utils";
import TagPill from "./TagPill";
import { CategoryIcon } from "./Icons";

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

        {/* Top row: category + importance */}
        <div className="mb-5 flex items-center justify-between pr-12">
          <div className="flex items-center gap-3">
            <CategoryIcon category={doc.category} className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {doc.category}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${
              doc.importance === "High" ? "bg-destructive" :
              doc.importance === "Medium" ? "bg-high" : "bg-green-500"
            }`} />
            {doc.importance} importance
          </span>
        </div>

        {/* Title */}
        <h2 className="mb-6 text-2xl font-bold leading-tight text-foreground">
          {doc.title}
        </h2>

        {/* Expanded summary */}
        <div className="mb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displaySummary}
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

        {/* Date */}
        <div className="mb-8 text-sm text-muted-foreground font-mono">
          <span>{formatDateLong(doc.publishedDate)}</span>
        </div>

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <div>
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-lime px-6 py-3 text-center text-sm font-semibold text-background transition-colors hover:bg-[var(--lime-30)]  hover:text-foreground"
          >
            View Source →
          </a>
        </div>
      </div>
    </div>
  );
}
