"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { searchAllContent, formatDate } from "@/lib/utils";
import {
  NewsItem,
  UAPDocument,
  UAPEvent,
  TimelineMilestone,
} from "@/lib/types";
import DocumentCard from "@/components/DocumentCard";
import EventCard from "@/components/EventCard";
import NewsCard from "@/components/NewsCard";
import { FileText, CalendarDays, MapPin, Newspaper } from "@/components/Icons";

const ITEMS_PER_PAGE = 10;

interface Props {
  documents: UAPDocument[];
  events: UAPEvent[];
  milestones: TimelineMilestone[];
  news: NewsItem[];
}

function SearchContent({ documents, events, milestones, news }: Props) {
  const searchParams = useSearchParams();
  const query = searchParams.get("tag") || searchParams.get("q") || "";

  const results = searchAllContent(query, documents, events, milestones, news);
  const totalResults =
    results.documents.length +
    results.events.length +
    results.milestones.length +
    results.news.length;

  // Per-section pagination
  const [docsDisplayed, setDocsDisplayed] = useState(ITEMS_PER_PAGE);
  const [eventsDisplayed, setEventsDisplayed] = useState(ITEMS_PER_PAGE);
  const [milestonesDisplayed, setMilestonesDisplayed] = useState(ITEMS_PER_PAGE);
  const [newsDisplayed, setNewsDisplayed] = useState(ITEMS_PER_PAGE);

  // Reset pagination when query changes
  useEffect(() => {
    setDocsDisplayed(ITEMS_PER_PAGE);
    setEventsDisplayed(ITEMS_PER_PAGE);
    setMilestonesDisplayed(ITEMS_PER_PAGE);
    setNewsDisplayed(ITEMS_PER_PAGE);
  }, [query]);

  const loadMoreClass =
    "mt-4 w-full rounded-lg border border-card-subtle bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-lime";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Search header */}
      <div className="mb-10">
        <h1
          className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
          style={{
            textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
            WebkitTextStroke: "0.3px currentColor",
          }}
        >
          Search Results
        </h1>
        <p className="mb-6 text-sm text-muted-foreground lg:text-base font-light">
          {query ? (
            <>
              Results for <span className="font-semibold text-lime">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            "Enter a search term or tag to begin"
          )}
        </p>

        {/* Result counts */}
        {query && totalResults > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {results.documents.length > 0 && (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-lime" />
                <span>{results.documents.length} document{results.documents.length !== 1 ? "s" : ""}</span>
              </span>
            )}
            {results.events.length > 0 && (
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue" />
                <span>{results.events.length} event{results.events.length !== 1 ? "s" : ""}</span>
              </span>
            )}
            {results.news.length > 0 && (
              <span className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-coral" />
                <span>{results.news.length} news article{results.news.length !== 1 ? "s" : ""}</span>
              </span>
            )}
            {results.milestones.length > 0 && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal" />
                <span>{results.milestones.length} milestone{results.milestones.length !== 1 ? "s" : ""}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* No results state */}
      {query && totalResults === 0 && (
        <div className="rounded-lg border border-card-subtle bg-card p-12 text-center">
          <p className="mb-2 text-lg text-muted-foreground">No results found</p>
          <p className="text-sm text-muted-foreground font-light">
            Try searching for different terms or browse our documents, events, and timeline.
          </p>
        </div>
      )}

      {/* Results grouped by type */}
      {query && totalResults > 0 && (
        <div className="space-y-10">
          {/* Documents section */}
          {results.documents.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-lime" />
                <h2 className="text-xl font-semibold text-foreground">Documents</h2>
                <span className="rounded-full bg-[var(--muted-50)] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {results.documents.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.documents.slice(0, docsDisplayed).map((result) => (
                  <DocumentCard key={result.id} doc={result.content as any} />
                ))}
              </div>
              {results.documents.length > docsDisplayed && (
                <button
                  onClick={() => setDocsDisplayed((prev) => prev + ITEMS_PER_PAGE)}
                  className={loadMoreClass}
                >
                  Load more documents ({results.documents.length - docsDisplayed} remaining)
                </button>
              )}
            </section>
          )}

          {/* Events section */}
          {results.events.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue" />
                <h2 className="text-xl font-semibold text-foreground">Events & Hearings</h2>
                <span className="rounded-full bg-[var(--muted-50)] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {results.events.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.events.slice(0, eventsDisplayed).map((result) => (
                  <EventCard key={result.id} event={result.content as any} />
                ))}
              </div>
              {results.events.length > eventsDisplayed && (
                <button
                  onClick={() => setEventsDisplayed((prev) => prev + ITEMS_PER_PAGE)}
                  className={loadMoreClass}
                >
                  Load more events ({results.events.length - eventsDisplayed} remaining)
                </button>
              )}
            </section>
          )}

          {/* News section */}
          {results.news.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-coral" />
                <h2 className="text-xl font-semibold text-foreground">News & Media</h2>
                <span className="rounded-full bg-[var(--muted-50)] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {results.news.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.news.slice(0, newsDisplayed).map((result) => (
                  <NewsCard key={result.id} item={result.content as NewsItem} />
                ))}
              </div>
              {results.news.length > newsDisplayed && (
                <button
                  onClick={() => setNewsDisplayed((prev) => prev + ITEMS_PER_PAGE)}
                  className={loadMoreClass}
                >
                  Load more news ({results.news.length - newsDisplayed} remaining)
                </button>
              )}
            </section>
          )}

          {/* Milestones section */}
          {results.milestones.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal" />
                <h2 className="text-xl font-semibold text-foreground">Timeline Milestones</h2>
                <span className="rounded-full bg-[var(--muted-50)] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {results.milestones.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.milestones.slice(0, milestonesDisplayed).map((result) => {
                  const milestone = result.content as any;
                  return (
                    <div
                      key={result.id}
                      className="rounded-lg border border-card-subtle bg-card p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-foreground">{milestone.title}</h3>
                          <p className="mb-3 text-sm text-muted-foreground font-light">{milestone.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                            <span>{formatDate(milestone.date)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${
                                milestone.importance === "Critical"
                                  ? "bg-destructive"
                                  : milestone.importance === "Major"
                                    ? "bg-blue"
                                    : "bg-muted-foreground"
                              }`} />
                              {milestone.importance}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {results.milestones.length > milestonesDisplayed && (
                <button
                  onClick={() => setMilestonesDisplayed((prev) => prev + ITEMS_PER_PAGE)}
                  className={loadMoreClass}
                >
                  Load more milestones ({results.milestones.length - milestonesDisplayed} remaining)
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1
            className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
            style={{
              textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
              WebkitTextStroke: "0.3px currentColor",
            }}
          >
            Search Results
          </h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SearchContent {...props} />
    </Suspense>
  );
}
