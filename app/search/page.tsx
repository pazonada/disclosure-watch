"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getDocuments, getEvents, getMilestones } from "@/lib/content";
import { searchAllContent, formatDate } from "@/lib/utils";
import DocumentCard from "@/components/DocumentCard";
import EventCard from "@/components/EventCard";
import { FileText, CalendarDays, MapPin } from "@/components/Icons";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("tag") || searchParams.get("q") || "";

  const documents = getDocuments();
  const events = getEvents();
  const milestones = getMilestones();

  const results = searchAllContent(query, documents, events, milestones);
  const totalResults = results.documents.length + results.events.length + results.milestones.length;

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
                {results.documents.map((result) => (
                  <DocumentCard key={result.id} doc={result.content as any} />
                ))}
              </div>
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
                {results.events.map((result) => (
                  <EventCard key={result.id} event={result.content as any} />
                ))}
              </div>
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
                {results.milestones.map((result) => {
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
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
      <SearchContent />
    </Suspense>
  );
}
