"use client";

import { useState } from "react";
import { getUpcomingEvents, getPastEvents } from "@/lib/content";
import EventCard from "@/components/EventCard";

const ITEMS_PER_PAGE = 10;

export default function EventsPage() {
  const upcoming = getUpcomingEvents();
  const past = getPastEvents();

  const [upcomingShown, setUpcomingShown] = useState(ITEMS_PER_PAGE);
  const [pastShown, setPastShown] = useState(ITEMS_PER_PAGE);

  const visibleUpcoming = upcoming.slice(0, upcomingShown);
  const visiblePast = past.slice(0, pastShown);

  const hasMoreUpcoming = upcoming.length > upcomingShown;
  const hasMorePast = past.length > pastShown;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Hearings & Events
      </h1>
      <p className="mb-10 max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
        Congressional hearings, Pentagon briefings, and other public events related to UAP disclosure.
      </p>

      {/* Upcoming */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full bg-lime" />
          Upcoming
        </h2>
        {upcoming.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleUpcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMoreUpcoming && (
              <button
                onClick={() => setUpcomingShown((prev) => prev + ITEMS_PER_PAGE)}
                className="mt-6 w-full rounded-lg border border-card-subtle bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-lime"
              >
                Load more upcoming events
              </button>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-card-subtle bg-card p-8 text-center text-muted-foreground">
            No upcoming events scheduled. Check back soon or subscribe to get notified.
          </p>
        )}
      </section>

      {/* Visual separator */}
      <div className="my-12 h-px bg-gradient-to-r from-transparent via-[var(--border-50)] to-transparent" />

      {/* Past */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          Past Hearings
        </h2>
        {past.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePast.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMorePast && (
              <button
                onClick={() => setPastShown((prev) => prev + ITEMS_PER_PAGE)}
                className="mt-6 w-full rounded-lg border border-card-subtle bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-foreground"
              >
                Load more past hearings
              </button>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-card-subtle bg-card p-8 text-center text-muted-foreground">
            No past events available.
          </p>
        )}
      </section>

    </div>
  );
}
