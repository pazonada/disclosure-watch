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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Hearings & Events</h1>
      <p className="mb-8 text-slate-400">
        Congressional hearings, Pentagon briefings, and other public events related to UAP disclosure.
      </p>

      {/* Upcoming */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-accent-cyan" />
          Upcoming
        </h2>
        {upcoming.length > 0 ? (
          <>
            <div className="grid gap-4">
              {visibleUpcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMoreUpcoming && (
              <button
                onClick={() => setUpcomingShown((prev) => prev + ITEMS_PER_PAGE)}
                className="mt-6 w-full rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 px-4 py-2.5 font-medium text-accent-cyan transition-all hover:bg-accent-cyan/10 hover:border-accent-cyan/50"
              >
                Load more upcoming events
              </button>
            )}
          </>
        ) : (
          <p className="rounded-xl border border-slate-700/50 bg-slate-850 p-8 text-center text-slate-500">
            No upcoming events scheduled. Check back soon or subscribe to get notified.
          </p>
        )}
      </section>

      {/* Visual separator */}
      <div className="my-12 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Past */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          Past Hearings
        </h2>
        {past.length > 0 ? (
          <>
            <div className="grid gap-4">
              {visiblePast.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMorePast && (
              <button
                onClick={() => setPastShown((prev) => prev + ITEMS_PER_PAGE)}
                className="mt-6 w-full rounded-lg border border-slate-700/50 bg-slate-850 px-4 py-2.5 font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
              >
                Load more past hearings
              </button>
            )}
          </>
        ) : (
          <p className="rounded-xl border border-slate-700/50 bg-slate-850 p-8 text-center text-slate-500">
            No past events available.
          </p>
        )}
      </section>

    </div>
  );
}
