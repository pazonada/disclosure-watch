"use client";

import { useState, useMemo, useEffect } from "react";
import { UAPDocument, DocumentCategory, DocumentSource, Importance } from "@/lib/types";
import { filterDocuments, sortByDate } from "@/lib/utils";
import DocumentCard from "./DocumentCard";
import DocumentModal from "./DocumentModal";
import FilterBar, { DateRange, SortOption } from "./FilterBar";
import SearchBar from "./SearchBar";

interface Props {
  documents: UAPDocument[];
}

const ITEMS_PER_PAGE = 20;

const IMPORTANCE_WEIGHT: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export default function DocumentFeed({ documents }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | undefined>();
  const [importance, setImportance] = useState<Importance | undefined>();
  const [source, setSource] = useState<DocumentSource | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [displayed, setDisplayed] = useState(ITEMS_PER_PAGE);
  const [activeDoc, setActiveDoc] = useState<UAPDocument | null>(null);

  // Reset pagination when any filter/sort changes
  useEffect(() => {
    setDisplayed(ITEMS_PER_PAGE);
  }, [category, importance, source, search, dateRange, sort]);

  const filtered = useMemo(() => {
    let result = filterDocuments(documents, { category, importance, source, search });

    // Apply date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "1y") cutoff.setFullYear(now.getFullYear() - 1);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      result = result.filter((doc) => doc.publishedDate >= cutoffStr);
    }

    // Apply sort
    if (sort === "newest") {
      return sortByDate(result, "desc");
    } else if (sort === "oldest") {
      return sortByDate(result, "asc");
    } else {
      // Sort by importance (High first), then by date desc as tiebreaker
      return [...result].sort((a, b) => {
        const weightDiff = (IMPORTANCE_WEIGHT[a.importance] ?? 2) - (IMPORTANCE_WEIGHT[b.importance] ?? 2);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
    }
  }, [documents, category, importance, source, search, dateRange, sort]);

  const visible = filtered.slice(0, displayed);
  const hasMore = filtered.length > displayed;

  const handleClearFilters = () => {
    setSearch("");
    setCategory(undefined);
    setImportance(undefined);
    setSource(undefined);
    setDateRange("all");
    setSort("newest");
  };

  // Nav helpers — navigate within the full filtered list, not just visible
  const activeIdx = activeDoc ? filtered.findIndex((d) => d.id === activeDoc.id) : -1;
  const handlePrev = activeIdx > 0 ? () => setActiveDoc(filtered[activeIdx - 1]) : undefined;
  const handleNext = activeIdx < filtered.length - 1 ? () => setActiveDoc(filtered[activeIdx + 1]) : undefined;

  const hasActiveFilters = !!(search || category || importance || source || dateRange !== "all");

  return (
    <div>
      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar
          category={category}
          importance={importance}
          source={source}
          dateRange={dateRange}
          sort={sort}
          onCategoryChange={setCategory}
          onImportanceChange={setImportance}
          onSourceChange={setSource}
          onDateRangeChange={setDateRange}
          onSortChange={setSort}
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground font-mono">
        {visible.length}/{filtered.length} document{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters && " matching filters"}
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
