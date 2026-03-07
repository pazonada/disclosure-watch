"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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
        setMessage("You're in! Check your inbox for a welcome email.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="rounded-xl border border-accent-blue/20 bg-gradient-to-br from-accent-blue/5 to-accent-cyan/5 p-6">
      <h3 className="mb-1 text-lg font-semibold text-white">Stay in the loop</h3>
      <p className="mb-4 text-sm text-slate-400">
        Get a weekly digest of new government UAP releases, upcoming hearings, and disclosure
        milestones. No spam, unsubscribe anytime.
      </p>

      {status === "success" ? (
        <p className="rounded-lg bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-accent-blue"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-accent-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {status === "loading" ? "..." : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-accent-red">{message}</p>
      )}
    </section>
  );
}
