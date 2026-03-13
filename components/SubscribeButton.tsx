"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    <form onSubmit={handleCheckout} className="space-y-3">
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
  );
}
