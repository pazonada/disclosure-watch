"use client";

import { useState, useEffect, useRef } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "already" | "unsub_form" | "unsub_loading" | "unsubscribed">("idle");
  const [message, setMessage] = useState("");

  // Anti-bot: honeypot text input value + timestamp when form mounted.
  // Real users don't fill the honeypot (it's aria-hidden and off-screen).
  // Bots typically submit forms in under a second; we require ≥1.5s.
  const [honeypot, setHoneypot] = useState("");
  const mountedAt = useRef<number>(0);

  // Check if user previously subscribed
  useEffect(() => {
    mountedAt.current = Date.now();
    try {
      if (localStorage.getItem("dw_newsletter_subscribed") === "true") {
        setStatus("already");
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    const elapsedMs = Date.now() - mountedAt.current;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, hp_website: honeypot, elapsedMs }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("You're in! Your first briefing arrives this Friday.");
        setEmail("");
        try {
          localStorage.setItem("dw_newsletter_subscribed", "true");
        } catch {
          // localStorage unavailable
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("unsub_loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("unsubscribed");
        setEmail("");
        try {
          localStorage.removeItem("dw_newsletter_subscribed");
        } catch {}
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  // Unsubscribed confirmation
  if (status === "unsubscribed") {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been unsubscribed from the weekly briefing.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Changed your mind? Subscribe again
        </button>
      </div>
    );
  }

  // Unsubscribe form
  if (status === "unsub_form" || status === "unsub_loading") {
    return (
      <div>
        <p className="mb-3 text-xs text-muted-foreground">
          Enter your email to unsubscribe from the weekly briefing:
        </p>
        <form onSubmit={handleUnsubscribe} className="flex gap-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-card-subtle bg-muted px-4 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-[var(--destructive)]"
          />
          <button
            type="submit"
            disabled={status === "unsub_loading"}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)] disabled:opacity-50"
          >
            {status === "unsub_loading" ? "..." : "Unsubscribe"}
          </button>
        </form>
        <button
          onClick={() => { setStatus("idle"); setEmail(""); }}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Already subscribed (from localStorage)
  if (status === "already") {
    return (
      <div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--lime-10)] px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-lime" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm font-medium text-lime">You&apos;re subscribed</p>
        </div>
        <p className="mt-3 text-sm text-muted-foreground font-light">
          Your weekly briefing arrives every Friday.
        </p>
        <div className="mt-2 flex gap-3">
          <button
            onClick={() => {
              setStatus("idle");
              try { localStorage.removeItem("dw_newsletter_subscribed"); } catch {}
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Subscribe with a different email
          </button>
          <button
            onClick={() => setStatus("unsub_form")}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Unsubscribe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {status === "success" ? (
        <div>
          <div className="flex items-center gap-2 rounded-lg bg-[var(--lime-10)] px-4 py-3">
            <svg className="h-4 w-4 flex-shrink-0 text-lime" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <p className="text-sm text-lime">{message}</p>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex gap-2">
            {/* Honeypot — invisible to real users, filled by naive form-fill bots */}
            <input
              type="text"
              name="hp_website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-card-subtle bg-muted px-4 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-lime"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-lime px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[var(--lime-30)] hover:text-foreground disabled:opacity-50"
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
          <button
            onClick={() => setStatus("unsub_form")}
            className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Need to unsubscribe?
          </button>
        </>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}
