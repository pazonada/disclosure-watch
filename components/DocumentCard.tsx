"use client";

import { useState } from "react";
import { UAPDocument } from "@/lib/types";
import { formatDate, importanceBadgeColor, categoryIcon } from "@/lib/utils";
import DocumentModal from "./DocumentModal";
import TagPill from "./TagPill";

interface Props {
  doc: UAPDocument;
}

export default function DocumentCard({ doc }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening modal when clicking on links
    if ((e.target as HTMLElement).closest("a")) {
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        className="group cursor-pointer rounded-xl border border-slate-700/50 bg-slate-850 p-5 transition-all hover:border-accent-blue/40 hover:bg-slate-800/80"
      >
        {/* Top row: category + importance */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryIcon(doc.category)}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {doc.category}
            </span>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${importanceBadgeColor(doc.importance)}`}
          >
            {doc.importance}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base font-semibold leading-snug text-white group-hover:text-accent-cyan">
          {doc.title}
        </h3>

        {/* Summary */}
        <p className="mb-4 text-sm leading-relaxed text-slate-400">{doc.summary}</p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{formatDate(doc.publishedDate)}</span>
          {doc.tags.slice(0, 3).map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>

        {/* Links */}
        <div className="mt-4">
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-accent-blue/10 px-3 py-1.5 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
          >
            View Source →
          </a>
        </div>
      </article>

      {/* Modal */}
      {isModalOpen && (
        <DocumentModal doc={doc} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
