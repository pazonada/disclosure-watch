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
      return { dot: "bg-amber-500 ring-amber-500/30", line: "border-amber-500/30" };
    case "Medium":
      return { dot: "bg-accent-blue ring-accent-blue/30", line: "border-accent-blue/30" };
    case "Low":
      return { dot: "bg-slate-500 ring-slate-500/30", line: "border-slate-700" };
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
        {/* Vertical line */}
        <div className="absolute left-4 top-0 h-full w-px bg-slate-700 sm:left-1/2" />

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
                className={`absolute left-4 z-10 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ${style.dot} sm:left-1/2`}
                style={{ top: "6px" }}
              />

              {/* Content card */}
              <div
                className={`ml-10 w-full rounded-xl border border-slate-700/50 bg-slate-850 p-4 sm:ml-0 sm:w-5/12 ${
                  isLeft ? "sm:mr-auto sm:pr-6" : "sm:ml-auto sm:pl-6"
                }`}
              >
                <span className="mb-1 block text-xs font-medium text-accent-cyan">
                  {formatDate(m.date)}
                </span>
                <h3 className="mb-1 font-semibold text-white">{m.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{m.description}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    m.importance === "High"
                      ? "bg-amber-500/20 text-amber-400"
                      : m.importance === "Medium"
                      ? "bg-accent-blue/20 text-accent-blue"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
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
            className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 px-6 py-2.5 font-medium text-accent-cyan transition-all hover:bg-accent-cyan/10 hover:border-accent-cyan/50"
          >
            Load more timeline events
          </button>
        </div>
      )}
    </div>
  );
}
