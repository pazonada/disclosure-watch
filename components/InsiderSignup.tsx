"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Preferences {
  trigger_documents: boolean;
  trigger_hearings: boolean;
  trigger_milestones: boolean;
  trigger_news: boolean;
  keywords: string[];
  frequency: "realtime" | "daily";
}

const DEFAULT_PREFS: Preferences = {
  trigger_documents: true,
  trigger_hearings: false,
  trigger_milestones: false,
  trigger_news: false,
  keywords: [],
  frequency: "realtime",
};

const TRIGGERS = [
  { key: "trigger_documents", label: "Government documents", desc: "AARO reports, FOIA releases, congressional reports" },
  { key: "trigger_hearings", label: "Hearings & events", desc: "Congressional hearings, Pentagon briefings, deadlines" },
  { key: "trigger_milestones", label: "Disclosure milestones", desc: "Major legislation, landmark statements, key moments" },
  { key: "trigger_news", label: "News articles", desc: "Curated UAP journalism from trusted sources" },
] as const;

export default function InsiderSignup() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [newKeyword, setNewKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null); // null = checking

  // Check if user is already an Insider
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/alerts/session");
        const data = await res.json();
        if (data.authenticated) {
          setIsSubscribed(true);
          return;
        }
      } catch {
        // ignore
      }
      setIsSubscribed(false);
    }
    checkSession();
  }, []);

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !prefs.keywords.includes(kw) && prefs.keywords.length < 10) {
      setPrefs({ ...prefs, keywords: [...prefs.keywords, kw] });
      setNewKeyword("");
    }
  }

  function removeKeyword(kw: string) {
    setPrefs({ ...prefs, keywords: prefs.keywords.filter((k) => k !== kw) });
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, preferences: prefs }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  // Still checking session
  if (isSubscribed === null) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  // Already subscribed — show management links
  if (isSubscribed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--blue-10)] px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm font-medium text-blue">You&apos;re an Insider</p>
        </div>
        <p className="text-sm text-muted-foreground font-light">
          Your subscription is active. Manage your alert preferences or billing below.
        </p>
        <div className="flex gap-2">
          <Link
            href="/alerts"
            className="flex-1 rounded-lg bg-blue px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            Manage alerts
          </Link>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/stripe/portal", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              } catch {
                // ignore
              }
            }}
            className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm text-muted-foreground transition-colors hover:border-[var(--blue-30)] hover:text-foreground"
          >
            Manage billing &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Not subscribed — show signup flow
  return (
    <div className="space-y-5">
      {/* Alert triggers */}
      <div>
        <p className="mb-2.5 text-xs font-medium text-foreground">Configure your alerts</p>
        <div className="space-y-1.5">
          {TRIGGERS.map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--blue-30)]"
            >
              <input
                type="checkbox"
                checked={prefs[key as keyof Preferences] as boolean}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border)] accent-blue"
              />
              <div>
                <span className="text-xs font-medium text-foreground">{label}</span>
                <p className="text-[11px] leading-snug text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Alert frequency */}
      <div>
        <p className="mb-2.5 text-xs font-medium text-foreground">Alert frequency</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPrefs({ ...prefs, frequency: "realtime" })}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              prefs.frequency === "realtime"
                ? "border-blue bg-[var(--blue-10)] text-blue"
                : "border-[var(--border)] text-muted-foreground hover:border-[var(--blue-30)]"
            }`}
          >
            Real-time
            <p className={`mt-0.5 text-[11px] font-normal ${prefs.frequency === "realtime" ? "text-blue/70" : "text-muted-foreground"}`}>
              As it happens
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPrefs({ ...prefs, frequency: "daily" })}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              prefs.frequency === "daily"
                ? "border-blue bg-[var(--blue-10)] text-blue"
                : "border-[var(--border)] text-muted-foreground hover:border-[var(--blue-30)]"
            }`}
          >
            Daily digest
            <p className={`mt-0.5 text-[11px] font-normal ${prefs.frequency === "daily" ? "text-blue/70" : "text-muted-foreground"}`}>
              One email per day
            </p>
          </button>
        </div>
      </div>

      {/* Keyword filters */}
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Keyword filters <span className="font-normal text-muted-foreground">(optional)</span></p>
        <div className="mb-2 flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. AARO, Grusch, NDAA..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-blue"
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={prefs.keywords.length >= 10}
            className="rounded-lg bg-[var(--muted)] px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-[var(--border)] disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {prefs.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {prefs.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-10)] px-2.5 py-0.5 text-xs text-blue"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="text-blue hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-muted-foreground italic">
          {prefs.keywords.length > 0
            ? "Keywords filter across all your selected categories. You\u2019ll only be alerted when a keyword appears in a matching document, article, or event."
            : "No keyword filters \u2014 you\u2019ll receive all alerts for your selected categories."}
        </p>
      </div>

      {/* Email + checkout */}
      <form onSubmit={handleCheckout} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-blue focus:ring-1 focus:ring-blue"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Become an Insider \u2014 $5/mo"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        )}
      </form>
    </div>
  );
}
