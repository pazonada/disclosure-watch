"use client";

import { useState } from "react";

export default function UnsubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("You've been unsubscribed. You won't receive any more emails from us.");
        setEmail("");
        try {
          localStorage.removeItem("dw_newsletter_subscribed");
        } catch {
          // localStorage unavailable
        }
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="mt-6 text-center">
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Need to unsubscribe?
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 text-center">
      <p className="mb-3 text-xs text-muted-foreground">
        Enter your email to unsubscribe from all Disclosure Watch emails:
      </p>
      <form onSubmit={handleUnsubscribe} className="mx-auto flex max-w-md gap-2">
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm text-foreground placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--destructive)]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)] disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Unsubscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-xs text-[var(--destructive)]">{message}</p>
      )}
    </div>
  );
}
