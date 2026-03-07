"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getDocuments, getOfficialDocuments, getUpcomingEvents, getPastEvents, getMilestones, getNews, getWeeklySummary } from "@/lib/content";
import { formatDate, sortByDate } from "@/lib/utils";
import EventCard from "@/components/EventCard";
import DocumentCard from "@/components/DocumentCard";
import DocumentModal from "@/components/DocumentModal";
import EventModal from "@/components/EventModal";
import StateOfDisclosure from "@/components/StateOfDisclosure";
import { UAPDocument, UAPEvent } from "@/lib/types";

export default function HomePage() {
  const allDocuments = useMemo(() => getDocuments(), []);
  const officialDocs = useMemo(() => getOfficialDocuments(), []);
  const upcomingEvents = useMemo(() => getUpcomingEvents(), []);
  const pastEvents = useMemo(() => getPastEvents(), []);
  const milestones = useMemo(() => getMilestones(), []);
  const newsItems = useMemo(() => getNews().slice(0, 12), []);
  const weeklySummary = useMemo(() => getWeeklySummary(), []);

  // For feed headline modals
  const [activeDoc, setActiveDoc] = useState<UAPDocument | null>(null);
  const [activeEvent, setActiveEvent] = useState<UAPEvent | null>(null);

  // 3 most recent official documents (not news items)
  const recentDocs = useMemo(
    () => sortByDate(officialDocs).slice(0, 3),
    [officialDocs]
  );

  const latestOfficialDoc = recentDocs[0] || null;

  const latestMilestone = useMemo(
    () => sortByDate(milestones)[0],
    [milestones]
  );

  const eventHighlight = useMemo(() => {
    if (upcomingEvents.length >= 2) {
      return upcomingEvents.slice(0, 3);
    }
    return pastEvents.slice(0, 2);
  }, [upcomingEvents, pastEvents]);

  const latestEvent = eventHighlight[0] || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero Section */}
      <section className="mb-10">
        <h1 className="mb-2 text-5xl font-bold text-white sm:text-6xl">
          Disclosure Watch
        </h1>
        <p className="text-lg text-slate-400">
          Your weekly intelligence briefing on UAP disclosure activity.
        </p>
      </section>

      {/* State of Disclosure — weekly summary */}
      <StateOfDisclosure summary={weeklySummary} />

      {/* Feed Headlines — latest activity, each opens a lightbox */}
      <section className="mb-12">
        <h2 className="sr-only">Latest Activity</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Latest document headline */}
          {latestOfficialDoc && (
            <button
              onClick={() => setActiveDoc(latestOfficialDoc)}
              className="group rounded-xl border border-slate-700/50 bg-slate-850 p-5 text-left transition-all hover:border-accent-blue/40 hover:bg-slate-800/80"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-blue">
                <span>📄</span>
                <span>Latest document</span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white group-hover:text-accent-cyan">
                {latestOfficialDoc.title}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(latestOfficialDoc.publishedDate)} · {officialDocs.length} total tracked
              </p>
            </button>
          )}

          {/* Latest event headline */}
          {latestEvent && (
            <button
              onClick={() => setActiveEvent(latestEvent)}
              className="group rounded-xl border border-slate-700/50 bg-slate-850 p-5 text-left transition-all hover:border-accent-cyan/40 hover:bg-slate-800/80"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-cyan">
                <span>🏛️</span>
                <span>{upcomingEvents.length > 0 ? "Upcoming event" : "Latest event"}</span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white group-hover:text-accent-cyan">
                {latestEvent.title}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(latestEvent.date)} · {upcomingEvents.length + pastEvents.length} total tracked
              </p>
            </button>
          )}

          {/* Latest timeline milestone headline */}
          {latestMilestone && (
            <Link
              href="/timeline"
              className="group rounded-xl border border-slate-700/50 bg-slate-850 p-5 transition-all hover:border-amber-500/40 hover:bg-slate-800/80"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-400">
                <span>📍</span>
                <span>Latest milestone</span>
              </div>
              <p className="text-sm font-semibold leading-snug text-white group-hover:text-accent-cyan">
                {latestMilestone.title}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(latestMilestone.date)} · {milestones.length} total tracked
              </p>
            </Link>
          )}
        </div>
      </section>

      {/* Latest Documents Feed — official documents only, not news */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Latest documents</h2>
          <Link
            href="/documents"
            className="text-sm text-accent-blue hover:text-accent-cyan transition-colors"
          >
            View all documents →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentDocs.length > 0 ? (
            recentDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-slate-700/50 bg-slate-850 p-8 text-center">
              <p className="text-slate-400">No documents available.</p>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events */}
      {eventHighlight.length > 0 && (
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {upcomingEvents.length > 0 ? "Upcoming events" : "Recent events"}
            </h2>
            <Link
              href="/events"
              className="text-sm text-accent-blue hover:text-accent-cyan transition-colors"
            >
              View all events →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventHighlight.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* News & Media Feed */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">News & Media</h2>
        </div>

        <ul className="space-y-1">
          {newsItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-800/60"
              >
                <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-blue" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-white group-hover:text-accent-cyan">
                    {item.type === "video" && (
                      <span className="mr-1.5 inline-block text-xs text-slate-500">▶</span>
                    )}
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(item.publishedDate)} · {item.source}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-600">
          External sources. Disclosure Watch is not affiliated with any of these outlets.
        </p>
      </section>


      {/* Lightbox modals triggered from feed headlines */}
      {activeDoc && (
        <DocumentModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      )}
      {activeEvent && (
        <EventModal event={activeEvent} onClose={() => setActiveEvent(null)} />
      )}
    </div>
  );
}
