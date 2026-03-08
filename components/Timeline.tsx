"use client";

import { useState } from "react";
import { TimelineMilestone } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Props {
  milestones: TimelineMilestone[];
  maxItems?: number;
}

function importanceStyle(importance: TimelineMilestone["importance"]) {
  switch (importance) {
    case "High":
      return { dot: "bg-white ring-2 ring-high" };
    case "Medium":
      return { dot: "bg-white ring-2 ring-blue" };
    case "Low":
      return { dot: "bg-white ring-2 ring-muted-foreground" };
  }
}

export default function Timeline({ milestones, maxItems = 15 }: Props) {
  const [displayed, setDisplayed] = useState(maxItems);

  const sorted = [...milestones].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const visible = sorted.slice(0, displayed);
  const hasMore = sorted.length > displayed;

  return (
    <div>
      <div className="relative">
        {/* Vertical line — sketched dotted style */}
        <svg
          className="absolute left-4 top-0 h-full sm:left-1/2"
          style={{ width: "3px", transform: "translateX(-50%)" }}
          preserveAspectRatio="none"
        >
          <line
            x1="1.5" y1="0" x2="1.5" y2="100%"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
        </svg>

        {visible.map((m, idx) => {
          const style = importanceStyle(m.importance);
          const isLeft = idx % 2 === 0;

          return (
            <div
              key={m.id}
              className={`relative mb-8 flex items-start ${
                isLeft ? "sm:flex-row" : "sm:flex-row-reverse"
              }`}
            >
              {/* Dot */}
              <div
                className={`absolute left-4 z-10 h-3 w-3 -translate-x-1/2 rounded-full ${style.dot} sm:left-1/2`}
                style={{ top: "6px" }}
              />

              {/* Content card */}
              <div
                className={`ml-10 w-full rounded-lg border border-card-subtle bg-card p-4 sm:ml-0 sm:w-5/12 ${
                  isLeft ? "sm:mr-auto sm:pr-6" : "sm:ml-auto sm:pl-6"
                }`}
              >
                <span className="mb-1 block text-xs font-mono text-lime">
                  {formatDate(m.date)}
                </span>
                <h3 className="mb-1 font-semibold text-foreground">{m.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-light">{m.description}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span className={`h-2 w-2 rounded-full ${
                    m.importance === "High"
                      ? "bg-high"
                      : m.importance === "Medium"
                      ? "bg-blue"
                      : "bg-muted-foreground"
                  }`} />
                  {m.importance}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setDisplayed((prev) => prev + maxItems)}
            className="rounded-lg border border-card-subtle bg-card px-6 py-2.5 font-mono text-sm text-muted-foreground transition-all hover:bg-[var(--muted-30)] hover:text-lime"
          >
            Load more timeline events
          </button>
        </div>
      )}
    </div>
  );
}
