import { getMilestones } from "@/lib/content";
import Timeline from "@/components/Timeline";

export const revalidate = 3600;

export const metadata = {
  title: "Disclosure Timeline — Disclosure Watch",
  description:
    "A visual timeline of key UAP disclosure milestones: legislation, government reports, congressional hearings, and major statements.",
};

export default function TimelinePage() {
  const milestones = getMilestones();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Disclosure Timeline</h1>
      <p className="mb-8 text-slate-400">
        Key moments in the journey from secrecy to transparency — legislation, government reports,
        congressional hearings, and major public statements about UAPs.
      </p>

      {/* Priority Legend */}
      <div className="mb-10 rounded-xl border border-slate-700/50 bg-slate-850/50 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Event Priority</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-500/30" />
            <div>
              <p className="text-xs font-medium text-white">Critical</p>
              <p className="text-xs text-slate-500">Major government disclosures or official releases</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-accent-blue ring-2 ring-accent-blue/30" />
            <div>
              <p className="text-xs font-medium text-white">Major</p>
              <p className="text-xs text-slate-500">Congressional hearings, significant policy changes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-slate-500 ring-2 ring-slate-500/30" />
            <div>
              <p className="text-xs font-medium text-white">Minor</p>
              <p className="text-xs text-slate-500">Supporting events, related developments</p>
            </div>
          </div>
        </div>
      </div>

      <Timeline milestones={milestones} maxItems={15} />
    </div>
  );
}
