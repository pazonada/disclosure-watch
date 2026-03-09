"use client";

import { useEffect, useState } from "react";
import { SubscriberRow } from "@/lib/supabase";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "unsubscribed">("all");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/subscribers")
      .then((r) => r.json())
      .then((data) => setSubscribers(data.subscribers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/subscribers/sync", { method: "POST" });
      const data = await res.json();
      if (data.subscribers) setSubscribers(data.subscribers);
    } catch {
      // ignore
    }
    setSyncing(false);
  };

  const filtered = subscribers.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "unsubscribed" && s.status !== "unsubscribed") return false;
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-3xl font-display tracking-wide text-foreground uppercase"
          style={{
            textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
            WebkitTextStroke: "0.3px currentColor",
          }}
        >
          Subscribers
        </h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-[var(--lime-10)] px-4 py-2 text-xs font-medium text-lime transition-colors hover:bg-[var(--lime-30)] disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync from Resend"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-card-subtle bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none"
        />
        <div className="flex gap-1">
          {(["all", "active", "unsubscribed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-2 text-xs font-mono transition-colors ${
                filter === f
                  ? "bg-[var(--lime-10)] text-lime"
                  : "text-muted-foreground hover:bg-[var(--muted-30)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground font-mono mb-4">
        {filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground font-mono animate-pulse py-12 text-center">
          Loading subscribers...
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-card-subtle bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {subscribers.length === 0
              ? 'No subscribers yet. Click "Sync from Resend" to import existing subscribers.'
              : "No subscribers match your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-card-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-subtle bg-[var(--muted-30)]">
                <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-card-subtle last:border-0 hover:bg-[var(--muted-30)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-foreground">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-mono ${
                        sub.status === "active"
                          ? "bg-[rgba(198,215,81,0.1)] text-lime"
                          : "bg-[var(--muted-50)] text-muted-foreground"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-mono ${
                        sub.tier === "paid"
                          ? "bg-[var(--blue-10)] text-blue"
                          : "bg-[var(--muted-50)] text-muted-foreground"
                      }`}
                    >
                      {sub.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {new Date(sub.subscribed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
