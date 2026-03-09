"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  subscribers: { total: number; active: number; paid: number };
  digests: { total: number; pending: number; latestWeek: string | null };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground font-mono animate-pulse">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="mb-8 text-3xl font-display tracking-wide text-foreground uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <StatCard
          label="Active Subscribers"
          value={stats?.subscribers.active ?? "—"}
          accent="lime"
        />
        <StatCard
          label="Paid Subscribers"
          value={stats?.subscribers.paid ?? "—"}
          accent="blue"
        />
        <StatCard
          label="Total Digests"
          value={stats?.digests.total ?? "—"}
          accent="teal"
        />
        <StatCard
          label="Pending Digests"
          value={stats?.digests.pending ?? "—"}
          accent={stats?.digests.pending ? "high" : "teal"}
        />
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/admin/subscribers"
          title="Subscribers"
          description="View and manage email subscribers"
        />
        <QuickLink
          href="/admin/digests"
          title="Weekly Digests"
          description="Review, edit, and approve email digests"
        />
        <QuickLink
          href="/admin/digests"
          title="Sync Subscribers"
          description="Pull latest subscribers from Resend"
          action={async () => {
            await fetch("/api/admin/subscribers/sync", { method: "POST" });
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  const accentMap: Record<string, string> = {
    lime: "border-l-lime",
    blue: "border-l-blue",
    teal: "border-l-teal",
    high: "border-l-high",
  };

  return (
    <div
      className={`rounded-lg border border-card-subtle border-l-2 ${accentMap[accent] || "border-l-lime"} bg-card p-5`}
    >
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  action,
}: {
  href: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
}) {
  if (action) {
    return (
      <button
        onClick={action}
        className="rounded-lg border border-card-subtle p-5 text-left transition-all hover:border-[var(--lime-30)] hover:bg-[var(--muted-30)]"
      >
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg border border-card-subtle p-5 transition-all hover:border-[var(--lime-30)] hover:bg-[var(--muted-30)]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
