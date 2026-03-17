"use client";

import { useState, useMemo, useEffect } from "react";
import { NewsItem, NewsType } from "@/lib/types";
import { sortByDate } from "@/lib/utils";
import NewsCard from "./NewsCard";
import NewsFilterBar, { NewsDateRange, NewsSortOption } from "./NewsFilterBar";
import SearchBar from "./SearchBar";

interface Props {
  news: NewsItem[];
}

const ITEMS_PER_PAGE = 20;

export default function NewsFeed({ news }: Props) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string | undefined>();
  const [type, setType] = useState<NewsType | undefined>();
  const [dateRange, setDateRange] = useState<NewsDateRange>("all");
  const [sort, setSort] = useState<NewsSortOption>("newest");
  const [displayed, setDisplayed] = useState(ITEMS_PER_PAGE);

  // Reset pagination when any filter/sort changes
  useEffect(() => {
    setDisplayed(ITEMS_PER_PAGE);
  }, [source, type, search, dateRange, sort]);

  // Derive available sources from data
  const availableSources = useMemo(
    () => Array.from(new Set(news.map((n) => n.source))).sort(),
    [news]
  );

  const filtered = useMemo(() => {
    let result = news;

    // Source filter
    if (source) {
      result = result.filter((item) => item.source === source);
    }

    // Type filter
    if (type) {
      result = result.filter((item) => item.type === type);
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "30d") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "1y") cutoff.setFullYear(now.getFullYear() - 1);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      result = result.filter((item) => item.publishedDate >= cutoffStr);
    }

    // Sort
    return sortByDate(result, sort === "newest" ? "desc" : "asc");
  }, [news, source, type, search, dateRange, sort]);

  const visible = filtered.slice(0, displayed);
  const hasMore = filtered.length > displayed;

  const handleClearFilters = () => {
    setSearch("");
    setSource(undefined);
    setType(undefined);
    setDateRange("all");
    setSort("newest");
  };

  const hasActiveFilters = !!(search || source || type || dateRange !== "all");

  return (
    <div>
      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        <NewsFilterBar
          source={source}
          type={type}
          dateRange={dateRange}
          sort={sort}
          sources={availableSources}
          onSourceChange={setSource}
          onTypeChange={setType}
          onDateRangeChange={setDateRange}
          onSortChange={setSort}
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground font-mono">
        {visible.length}/{filtered.length} article{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters && " matching filters"}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setDisplayed((prev) => prev + ITEMS_PER_PAGE)}
              className="mt-6 w-full rounded-lg border border-card-subtle bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-lime"
            >
              Load more articles
            </button>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-card-subtle bg-card p-12 text-center">
          <p className="text-lg text-muted-foreground">No articles match your filters.</p>
          <button
            onClick={handleClearFilters}
            className="mt-3 text-sm text-lime hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
