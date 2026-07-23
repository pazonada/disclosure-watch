import { getMilestones } from "@/lib/content";
import Timeline from "@/components/Timeline";

export const revalidate = 3600;

export const metadata = {
  title: "Disclosure Timeline — Disclosure Watch",
  description:
    "A visual timeline of key UAP disclosure milestones: legislation, government reports, congressional hearings, and major statements.",
};

export default async function TimelinePage() {
  const milestones = await getMilestones();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Disclosure Timeline
      </h1>
      <p className="mb-10 max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
        Key moments in the journey from secrecy to transparency — legislation, government reports,
        congressional hearings, and major public statements about UAPs.
      </p>

      {/* Importance Legend */}
      <div className="mb-10 rounded-lg border border-card-subtle bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Importance</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-high ring-2 ring-[var(--high-20)]" />
            <div>
              <p className="text-xs font-medium text-foreground">High</p>
              <p className="text-xs text-muted-foreground">Major government disclosures or official releases</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue ring-2 ring-[var(--blue-10)]" />
            <div>
              <p className="text-xs font-medium text-foreground">Medium</p>
              <p className="text-xs text-muted-foreground">Congressional hearings, significant policy changes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-muted-foreground ring-2 ring-[var(--muted-30)]" />
            <div>
              <p className="text-xs font-medium text-foreground">Low</p>
              <p className="text-xs text-muted-foreground">Supporting events, related developments</p>
            </div>
          </div>
        </div>
      </div>

      <Timeline milestones={milestones} maxItems={15} />
    </div>
  );
}
