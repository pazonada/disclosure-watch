"use client";

import { useState, useEffect } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "already">("idle");
  const [message, setMessage] = useState("");

  // Check if user previously subscribed
  useEffect(() => {
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

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
          Your weekly briefing arrives every Friday. To unsubscribe, use the link at the bottom of any briefing email.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            try { localStorage.removeItem("dw_newsletter_subscribed"); } catch {}
          }}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Subscribe with a different email
        </button>
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
        <form onSubmit={handleSubmit} className="flex gap-2">
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
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}
