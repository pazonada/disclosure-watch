"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getDocuments, getOfficialDocuments, getUpcomingEvents, getPastEvents, getMilestones, getNews, getWeeklySummary } from "@/lib/content";
import { formatDate, sortByDate } from "@/lib/utils";
import EventCard from "@/components/EventCard";
import DocumentCard from "@/components/DocumentCard";
import DocumentModal from "@/components/DocumentModal";
import EventModal from "@/components/EventModal";
import { UAPDocument, UAPEvent } from "@/lib/types";
import { FileText, CalendarDays, Newspaper, MapPin, AlertTriangle } from "@/components/Icons";

export default function HomePage() {
  const allDocuments = useMemo(() => getDocuments(), []);
  const officialDocs = useMemo(() => getOfficialDocuments(), []);
  const upcomingEvents = useMemo(() => getUpcomingEvents(), []);
  const pastEvents = useMemo(() => getPastEvents(), []);
  const milestones = useMemo(() => getMilestones(), []);
  const newsItems = useMemo(() => getNews().slice(0, 24), []);
  const weeklySummary = useMemo(() => getWeeklySummary(), []);

  const [activeDoc, setActiveDoc] = useState<UAPDocument | null>(null);
  const [activeEvent, setActiveEvent] = useState<UAPEvent | null>(null);
  const [newsDisplayed, setNewsDisplayed] = useState(8);

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
    <>
      {/* ── Hero Section (v0 2-column layout) ── */}
      <section className="relative overflow-hidden border-b border-card-subtle">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--lime-5)] via-transparent to-[var(--blue-5)]" />
        {/* Earth background image — Photo by Javier Miranda on Unsplash */}
        <div
          className="absolute bottom-0 right-0 w-1/2 h-full hidden lg:block pointer-events-none"
          style={{
            backgroundImage: "url(/images/earth-hero.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.3,
            maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left column — State of Disclosure */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground w-fit mb-6">
                <span className="text-sm">🛸</span>
                <span>STATE OF DISCLOSURE</span>
                <span className="text-border">|</span>
                <span className="text-foreground">Week of {new Date(weeklySummary.weekOf).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>

              <h1
                className="text-3xl font-display tracking-wide text-foreground sm:text-4xl lg:text-5xl text-balance uppercase"
                style={{
                  textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
                  WebkitTextStroke: "0.3px currentColor",
                }}
              >
                Your weekly intelligence briefing on{" "}
                <span className="text-lime">UAP disclosure</span> activity.
              </h1>

              <p className="mt-6 text-sm text-muted-foreground leading-relaxed lg:text-base" style={{ fontWeight: 350 }}>
                {weeklySummary.summary}
              </p>



            </div>

            {/* Right column — Quick stat cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 content-start">
              {latestOfficialDoc && (
                <button
                  onClick={() => setActiveDoc(latestOfficialDoc)}
                  className="rounded-lg border border-card-subtle border-l-2 border-l-lime px-3 py-2.5 text-left transition-colors hover:bg-[var(--muted-30)]"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md bg-[var(--lime-10)] p-1.5 mt-0.5">
                      <FileText className="h-4 w-4 text-lime" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Latest document</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground line-clamp-2">{latestOfficialDoc.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{formatDate(latestOfficialDoc.publishedDate)}</span>
                        <span className="text-border">·</span>
                        <span>{officialDocs.length} total tracked</span>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {latestEvent && (
                <button
                  onClick={() => setActiveEvent(latestEvent)}
                  className="rounded-lg border border-card-subtle border-l-2 border-l-blue px-3 py-2.5 text-left transition-colors hover:bg-[var(--muted-30)]"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md bg-[var(--blue-10)] p-1.5 mt-0.5">
                      <CalendarDays className="h-4 w-4 text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        {upcomingEvents.length > 0 ? "Upcoming event" : "Latest event"}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground line-clamp-2">{latestEvent.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{formatDate(latestEvent.date)}</span>
                        <span className="text-border">·</span>
                        <span>{upcomingEvents.length + pastEvents.length} total tracked</span>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {latestMilestone && (
                <Link
                  href="/timeline"
                  className="rounded-lg border border-card-subtle border-l-2 border-l-teal px-3 py-2.5 transition-colors hover:bg-[var(--muted-30)] sm:col-span-2 lg:col-span-1 xl:col-span-2"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md bg-[var(--teal-10)] p-1.5 mt-0.5">
                      <MapPin className="h-4 w-4 text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Latest milestone</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground line-clamp-2">{latestMilestone.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{formatDate(latestMilestone.date)}</span>
                        <span className="text-border">·</span>
                        <span>{milestones.length} total tracked</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-[rgba(255,255,255,0.08)] bg-[var(--muted-30)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
            {[
              { icon: <FileText className="h-6 w-6 text-lime" />, value: officialDocs.length, label: "Documents", colorClass: "text-lime" },
              { icon: <CalendarDays className="h-6 w-6 text-blue" />, value: upcomingEvents.length + pastEvents.length, label: "Events", colorClass: "text-blue" },
              { icon: <Newspaper className="h-6 w-6 text-coral" />, value: newsItems.length, label: "News Items", colorClass: "text-coral" },
              { icon: <MapPin className="h-6 w-6 text-teal" />, value: milestones.length, label: "Milestones", colorClass: "text-teal" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background border border-card-subtle">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-display tracking-wide text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Documents ── */}
      <section className="border-b border-card-subtle py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--lime-10)] glow-primary-sm">
                <FileText className="h-10 w-10 text-lime" />
              </div>
              <div>
                <h2 className="text-2xl font-display tracking-wide text-foreground uppercase">
                  Latest Documents
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  Official releases and reports
                </p>
              </div>
            </div>
            <Link href="/documents" className="text-sm text-muted-foreground hover:text-foreground transition-colors group">
              View all documents <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentDocs.length > 0 ? (
              recentDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-card-subtle bg-card p-8 text-center">
                <p className="text-muted-foreground">No documents available.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ── */}
      {eventHighlight.length > 0 && (
        <section className="border-b border-card-subtle py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--blue-10)]">
                  <CalendarDays className="h-10 w-10 text-blue" />
                </div>
                <div>
                  <h2 className="text-2xl font-display tracking-wide text-foreground uppercase">
                    {upcomingEvents.length > 0 ? "Upcoming Events" : "Recent Events"}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    Conferences, hearings, and deadlines
                  </p>
                </div>
              </div>
              <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors group">
                View all events <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eventHighlight.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── News & Media ── */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--coral-10)]">
              <Newspaper className="h-10 w-10 text-coral" />
            </div>
            <div>
              <h2 className="text-2xl font-display tracking-wide text-foreground uppercase">
                News & Media
              </h2>
              <p className="text-sm text-muted-foreground font-mono">
                External coverage from trusted outlets
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-card-subtle bg-card overflow-hidden">
            <ul className="divide-y divide-[var(--border-50)]">
              {newsItems.slice(0, newsDisplayed).map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--muted-30)]"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="flex-shrink-0 text-lime text-xs mt-0.5">&#9656;</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground group-hover:text-lime transition-colors line-clamp-1">
                          {item.type === "video" && (
                            <span className="mr-1.5 inline-block text-xs text-muted-foreground">▶</span>
                          )}
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                          {formatDate(item.publishedDate)} · {item.source}
                        </p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-lime transition-all">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {newsItems.length > newsDisplayed && (
              <button
                onClick={() => setNewsDisplayed((prev) => prev + 8)}
                className="w-full border-t border-[var(--border-50)] px-5 py-3 text-sm font-mono text-muted-foreground hover:text-lime hover:bg-[var(--muted-30)] transition-colors"
              >
                Load more ({newsItems.length - newsDisplayed} remaining)
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-center font-mono italic text-[rgba(133,145,160,0.4)]">
            External sources. Disclosure Watch is not affiliated with any of these outlets.
          </p>
        </div>
      </section>

      {/* Lightbox modals */}
      {activeDoc && (() => {
        const idx = recentDocs.findIndex((d) => d.id === activeDoc.id);
        return (
          <DocumentModal
            doc={activeDoc}
            onClose={() => setActiveDoc(null)}
            onPrev={idx > 0 ? () => setActiveDoc(recentDocs[idx - 1]) : undefined}
            onNext={idx < recentDocs.length - 1 ? () => setActiveDoc(recentDocs[idx + 1]) : undefined}
          />
        );
      })()}
      {activeEvent && (() => {
        const idx = eventHighlight.findIndex((e) => e.id === activeEvent.id);
        return (
          <EventModal
            event={activeEvent}
            onClose={() => setActiveEvent(null)}
            onPrev={idx > 0 ? () => setActiveEvent(eventHighlight[idx - 1]) : undefined}
            onNext={idx < eventHighlight.length - 1 ? () => setActiveEvent(eventHighlight[idx + 1]) : undefined}
          />
        );
      })()}
    </>
  );
}
