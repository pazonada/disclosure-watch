"use client";

import { useState, useMemo } from "react";
import { UAPDocument, DocumentCategory, Importance } from "@/lib/types";
import { filterDocuments, sortByDate } from "@/lib/utils";
import DocumentCard from "./DocumentCard";
import DocumentModal from "./DocumentModal";
import FilterBar from "./FilterBar";
import SearchBar from "./SearchBar";

interface Props {
  documents: UAPDocument[];
}

const ITEMS_PER_PAGE = 10;

export default function DocumentFeed({ documents }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | undefined>();
  const [importance, setImportance] = useState<Importance | undefined>();
  const [displayed, setDisplayed] = useState(ITEMS_PER_PAGE);
  const [activeDoc, setActiveDoc] = useState<UAPDocument | null>(null);

  const filtered = useMemo(() => {
    const result = filterDocuments(documents, { category, importance, search });
    return sortByDate(result);
  }, [documents, category, importance, search]);

  const visible = filtered.slice(0, displayed);
  const hasMore = filtered.length > displayed;

  const handleClearFilters = () => {
    setSearch("");
    setCategory(undefined);
    setImportance(undefined);
    setDisplayed(ITEMS_PER_PAGE);
  };

  // Nav helpers — navigate within the full filtered list, not just visible
  const activeIdx = activeDoc ? filtered.findIndex((d) => d.id === activeDoc.id) : -1;
  const handlePrev = activeIdx > 0 ? () => setActiveDoc(filtered[activeIdx - 1]) : undefined;
  const handleNext = activeIdx < filtered.length - 1 ? () => setActiveDoc(filtered[activeIdx + 1]) : undefined;

  return (
    <div>
      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar
          category={category}
          importance={importance}
          onCategoryChange={setCategory}
          onImportanceChange={setImportance}
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground font-mono">
        {visible.length}/{filtered.length} document{filtered.length !== 1 ? "s" : ""}
        {(search || category || importance) && " matching filters"}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onCardClick={setActiveDoc} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setDisplayed((prev) => prev + ITEMS_PER_PAGE)}
              className="mt-6 w-full rounded-lg border border-card-subtle bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-lime"
            >
              Load more documents
            </button>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-card-subtle bg-card p-12 text-center">
          <p className="text-lg text-muted-foreground">No documents match your filters.</p>
          <button
            onClick={handleClearFilters}
            className="mt-3 text-sm text-lime hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Centralized modal with prev/next */}
      {activeDoc && (
        <DocumentModal
          doc={activeDoc}
          onClose={() => setActiveDoc(null)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
