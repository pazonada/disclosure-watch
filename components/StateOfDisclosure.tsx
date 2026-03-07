"use client";

import { WeeklySummary } from "@/lib/types";

interface Props {
  summary: WeeklySummary;
}

function formatWeekOf(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function StateOfDisclosure({ summary }: Props) {
  return (
    <section className="mb-10">
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-850 to-slate-900 p-6 sm:p-8">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-cyan">
          <span>📡</span>
          <span>State of Disclosure</span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Week of {formatWeekOf(summary.weekOf)}
        </p>
        <p className="text-base leading-relaxed text-slate-300">
          {summary.summary}
        </p>
      </div>
    </section>
  );
}
