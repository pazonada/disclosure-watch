"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getDocuments, getEvents, getMilestones } from "@/lib/content";
import { searchAllContent, formatDate, importanceBadgeColor, categoryIcon, sourceLabel } from "@/lib/utils";
import DocumentCard from "@/components/DocumentCard";
import EventCard from "@/components/EventCard";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("tag") || searchParams.get("q") || "";

  const documents = getDocuments();
  const events = getEvents();
  const milestones = getMilestones();

  const results = searchAllContent(query, documents, events, milestones);
  const totalResults = results.documents.length + results.events.length + results.milestones.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Search header */}
      <div className="mb-10">
        <h1 className="mb-3 text-3xl font-bold text-white">Search Results</h1>
        <p className="mb-6 text-lg text-slate-400">
          {query ? (
            <>
              Results for <span className="font-semibold text-accent-cyan">"{query}"</span>
            </>
          ) : (
            "Enter a search term or tag to begin"
          )}
        </p>

        {/* Result counts */}
        {query && totalResults > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            {results.documents.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span>{results.documents.length} document{results.documents.length !== 1 ? "s" : ""}</span>
              </span>
            )}
            {results.events.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-lg">🏛️</span>
                <span>{results.events.length} event{results.events.length !== 1 ? "s" : ""}</span>
              </span>
            )}
            {results.milestones.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span>{results.milestones.length} milestone{results.milestones.length !== 1 ? "s" : ""}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* No results state */}
      {query && totalResults === 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-850 p-12 text-center">
          <p className="mb-2 text-lg text-slate-400">No results found</p>
          <p className="text-sm text-slate-500">
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
                <span className="text-2xl">📄</span>
                <h2 className="text-xl font-semibold text-white">Documents</h2>
                <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {results.documents.length}
                </span>
              </div>
              <div className="space-y-4">
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
                <span className="text-2xl">🏛️</span>
                <h2 className="text-xl font-semibold text-white">Events & Hearings</h2>
                <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {results.events.length}
                </span>
              </div>
              <div className="space-y-4">
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
                <span className="text-2xl">📍</span>
                <h2 className="text-xl font-semibold text-white">Timeline Milestones</h2>
                <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {results.milestones.length}
                </span>
              </div>
              <div className="space-y-4">
                {results.milestones.map((result) => {
                  const milestone = result.content as any;
                  return (
                    <div
                      key={result.id}
                      className="rounded-xl border border-slate-700/50 bg-slate-850 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-white">{milestone.title}</h3>
                          <p className="mb-3 text-sm text-slate-400">{milestone.description}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-medium text-slate-300">{formatDate(milestone.date)}</span>
                            <span>·</span>
                            <span
                              className={`rounded-full px-2 py-1 font-medium ${
                                milestone.importance === "Critical"
                                  ? "bg-red-500/20 text-red-400"
                                  : milestone.importance === "Major"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
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
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-3 text-3xl font-bold text-white">Search Results</h1>
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
