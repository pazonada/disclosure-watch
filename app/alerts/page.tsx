"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

type Step = "checking" | "email" | "code" | "editor";

export default function AlertsPage() {
  const [step, setStep] = useState<Step>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [newKeyword, setNewKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Check for returning Stripe checkout session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      setMessage("Payment successful! Verify your email below to start configuring your alerts.");
      window.history.replaceState({}, "", "/alerts");
    }
  }, []);

  // On mount, check if we already have a valid session cookie
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/alerts/session");
        const data = await res.json();
        if (data.authenticated) {
          setEmail(data.email);
          await loadPreferences();
          setStep("editor");
          return;
        }
      } catch {
        // ignore
      }
      setStep("email");
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPreferences() {
    const res = await fetch("/api/alerts/preferences");
    if (res.ok) {
      const data = await res.json();
      setPrefs(data);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alerts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage("Verification code sent! Check your inbox.");
        setStep("code");
      } else if (res.status === 403) {
        setError("This email doesn't have an active Insider subscription. Become an Insider to access alerts.");
      } else if (res.status === 429) {
        setError("Too many verification attempts. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alerts/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (res.ok) {
        setMessage("");
        await loadPreferences();
        setStep("editor");
      } else {
        setError("Invalid or expired verification code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/alerts/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });

      if (res.ok) {
        setMessage("Preferences saved!");
      } else {
        setError("Failed to save preferences.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setSaving(false);
  }

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

  async function openPortal() {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Failed to open billing portal.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Alert settings
      </h1>
      <p className="mb-8 text-sm text-muted-foreground leading-relaxed font-light">
        Configure what triggers an alert email. Included with your Insider subscription.
      </p>

      {message && (
        <div className="mb-6 rounded-lg bg-[var(--lime-10)] px-4 py-3 text-sm text-lime">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-[var(--destructive-10)] px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
          {error.includes("Become an Insider") && (
            <Link href="/subscribe" className="ml-2 underline">
              Become an Insider →
            </Link>
          )}
        </div>
      )}

      {step === "checking" && (
        <div className="rounded-lg border border-card-subtle bg-card p-6 sm:p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {step === "email" && (
        /* ── Email entry step ── */
        <div className="rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
          <p className="mb-4 text-sm text-muted-foreground">
            Enter your Insider email address to get a verification code:
          </p>
          <form onSubmit={handleSendCode} className="flex gap-2">
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-lime focus:ring-1 focus:ring-lime"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-lime px-5 py-2.5 text-sm font-medium text-[var(--background)] transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        </div>
      )}

      {step === "code" && (
        /* ── Code verification step ── */
        <div className="rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
          <p className="mb-1 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            The code expires in 10 minutes.{" "}
            <button
              onClick={() => { setStep("email"); setCode(""); setMessage(""); }}
              className="text-lime underline"
            >
              Use a different email
            </button>
          </p>
          <form onSubmit={handleVerifyCode} className="flex gap-2">
            <input
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-36 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-center text-lg font-mono tracking-[0.2em] text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-lime focus:ring-1 focus:ring-lime"
            />
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="rounded-lg bg-lime px-5 py-2.5 text-sm font-medium text-[var(--background)] transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      )}

      {step === "editor" && (
        /* ── Preferences editor ── */
        <div className="space-y-6">
          {/* Trigger types */}
          <div className="rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Alert triggers</h2>
            <p className="mb-5 text-sm text-muted-foreground font-light">
              Choose which types of new content should trigger an email alert:
            </p>

            <div className="space-y-3">
              {[
                { key: "trigger_documents", label: "New government documents", desc: "AARO reports, FOIA releases, congressional reports" },
                { key: "trigger_hearings", label: "Hearings & events", desc: "Congressional hearings, Pentagon briefings, deadlines" },
                { key: "trigger_milestones", label: "Disclosure milestones", desc: "Major legislation, landmark statements, key moments" },
                { key: "trigger_news", label: "News articles", desc: "Curated UAP journalism from trusted sources" },
              ].map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-4 transition-colors hover:border-[var(--lime-30)]"
                >
                  <input
                    type="checkbox"
                    checked={prefs[key as keyof Preferences] as boolean}
                    onChange={(e) =>
                      setPrefs({ ...prefs, [key]: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-lime"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Keyword filters</h2>
            <p className="mb-5 text-sm text-muted-foreground font-light">
              Optionally narrow your alerts to items matching specific keywords. Leave empty to get
              all alerts for your selected trigger types.
            </p>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="e.g. AARO, Grusch, NDAA, reverse engineering..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-lime"
              />
              <button
                onClick={addKeyword}
                disabled={prefs.keywords.length >= 10}
                className="rounded-lg bg-[var(--muted)] px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-[var(--border)] disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {prefs.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prefs.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lime-10)] px-3 py-1 text-sm text-lime"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="text-lime hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No keyword filters — you&apos;ll receive alerts for all matching trigger types.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {prefs.keywords.length}/10 keywords
            </p>
          </div>

          {/* Save + billing */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-lime px-6 py-3 text-sm font-medium text-[var(--background)] transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>

            <button
              onClick={openPortal}
              className="rounded-lg border border-[var(--border)] px-5 py-3 text-sm text-muted-foreground transition-colors hover:border-[var(--lime-30)] hover:text-foreground"
            >
              Manage billing →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
