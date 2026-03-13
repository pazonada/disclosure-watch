"use client";

import { useState } from "react";

interface Preferences {
  trigger_documents: boolean;
  trigger_hearings: boolean;
  trigger_milestones: boolean;
  trigger_news: boolean;
  keywords: string[];
}

const DEFAULT_PREFS: Preferences = {
  trigger_documents: true,
  trigger_hearings: true,
  trigger_milestones: true,
  trigger_news: false,
  keywords: [],
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
          <div className="flex flex-wrap gap-1.5">
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
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            No keyword filters — you&apos;ll receive all alerts for your selected triggers.
          </p>
        )}
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
            {loading ? "Redirecting..." : "Become an Insider — $5/mo"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        )}
      </form>
    </div>
  );
}
