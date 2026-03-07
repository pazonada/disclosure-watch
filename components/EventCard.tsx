"use client";

import { useState } from "react";
import { UAPEvent } from "@/lib/types";
import { formatDate, isUpcoming } from "@/lib/utils";
import EventModal from "./EventModal";

interface Props {
  event: UAPEvent;
}

export default function EventCard({ event }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const upcoming = isUpcoming(event.date);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    setIsModalOpen(true);
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        className={`group cursor-pointer rounded-xl border p-5 transition-all hover:shadow-lg ${
          upcoming
            ? "border-accent-cyan/30 bg-accent-cyan/5 hover:border-accent-cyan/50 hover:bg-accent-cyan/10"
            : "border-slate-700/50 bg-slate-850 hover:border-slate-600 hover:bg-slate-800/80"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          {upcoming && (
            <span className="rounded-full bg-accent-cyan/20 px-2 py-0.5 text-xs font-medium text-accent-cyan">
              Upcoming
            </span>
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {event.type}
          </span>
        </div>

        <h3 className="mb-2 font-semibold text-white group-hover:text-accent-cyan transition-colors">
          {event.title}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">{event.description}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-300">{formatDate(event.date)}</span>
          {event.committee && (
            <>
              <span>·</span>
              <span>{event.committee}</span>
            </>
          )}
        </div>

        {(event.videoUrl || event.transcriptUrl) && (
          <div className="mt-3 flex gap-2">
            {event.videoUrl && (
              <a
                href={event.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent-blue/10 px-3 py-1.5 text-xs font-medium text-accent-blue hover:bg-accent-blue/20"
              >
                Watch ▶
              </a>
            )}
            {event.transcriptUrl && (
              <a
                href={event.transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Transcript
              </a>
            )}
          </div>
        )}
      </article>

      {isModalOpen && (
        <EventModal event={event} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
