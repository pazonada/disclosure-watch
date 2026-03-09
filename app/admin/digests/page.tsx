"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DigestRow } from "@/lib/supabase";

export default function DigestsPage() {
  const [digests, setDigests] = useState<DigestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/digests")
      .then((r) => r.json())
      .then((data) => setDigests(data.digests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: "bg-[var(--high-10)] text-high",
    approved: "bg-[var(--blue-10)] text-blue",
    sent: "bg-[rgba(198,215,81,0.1)] text-lime",
  };

  return (
    <div>
      <h1
        className="mb-8 text-3xl font-display tracking-wide text-foreground uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Weekly Digests
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground font-mono animate-pulse py-12 text-center">
          Loading digests...
        </p>
      ) : digests.length === 0 ? (
        <div className="rounded-lg border border-card-subtle bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-2">
            No digests yet. They're created automatically when the daily ingest runs.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            The ingest cron runs daily at 9 AM UTC.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((digest) => {
            const deadline = new Date(digest.auto_send_deadline);
            const isPastDeadline = new Date() > deadline;

            return (
              <Link
                key={digest.id}
                href={`/admin/digests/${digest.id}`}
                className="flex items-center justify-between rounded-lg border border-card-subtle p-5 transition-all hover:border-[var(--lime-30)] hover:bg-[var(--muted-30)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Week of {digest.week_of}
                    </h3>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-mono ${statusColor[digest.status] || "bg-[var(--muted-50)] text-muted-foreground"}`}
                    >
                      {digest.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {digest.summary_text.slice(0, 120)}
                    {digest.summary_text.length > 120 ? "..." : ""}
                  </p>
                </div>

                <div className="ml-4 flex-shrink-0 text-right">
                  {digest.status === "sent" && digest.sent_at ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      Sent {new Date(digest.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  ) : (
                    <p className={`text-xs font-mono ${isPastDeadline ? "text-destructive" : "text-muted-foreground"}`}>
                      {isPastDeadline ? "Past deadline" : `Auto-send ${deadline.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} 12pm ET`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
