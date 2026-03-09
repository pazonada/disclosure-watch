"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DigestRow } from "@/lib/supabase";

export default function DigestEditorPage() {
  const params = useParams();
  const router = useRouter();
  const digestId = params.id as string;

  const [digest, setDigest] = useState<DigestRow | null>(null);
  const [editedText, setEditedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch("/api/admin/digests")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.digests ?? []).find((d: DigestRow) => d.id === digestId);
        if (found) {
          setDigest(found);
          setEditedText(found.summary_text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [digestId]);

  const showMsg = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/digests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: digestId, summary_text: editedText }),
      });
      if (res.ok) {
        const data = await res.json();
        setDigest(data.digest);
        showMsg("success", "Saved");
      } else {
        showMsg("error", "Failed to save");
      }
    } catch {
      showMsg("error", "Failed to save");
    }
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/digests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: digestId, summary_text: editedText, status: "approved" }),
      });
      if (res.ok) {
        const data = await res.json();
        setDigest(data.digest);
        showMsg("success", "Approved — will auto-send at deadline if not sent manually");
      } else {
        showMsg("error", "Failed to approve");
      }
    } catch {
      showMsg("error", "Failed to approve");
    }
    setSaving(false);
  };

  const handleSendNow = async () => {
    if (!confirm("Send this digest to all active subscribers now?")) return;
    setSending(true);
    try {
      // Save latest text first
      await fetch("/api/admin/digests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: digestId, summary_text: editedText }),
      });

      const res = await fetch("/api/admin/digests/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestId }),
      });

      if (res.ok) {
        const data = await res.json();
        setDigest((prev) => prev ? { ...prev, status: "sent", sent_at: new Date().toISOString() } : prev);
        showMsg("success", `Sent to ${data.sent} subscribers`);
      } else {
        const data = await res.json();
        showMsg("error", data.error || "Failed to send");
      }
    } catch {
      showMsg("error", "Failed to send");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground font-mono animate-pulse">Loading digest...</p>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Digest not found.</p>
        <button onClick={() => router.push("/admin/digests")} className="mt-4 text-sm text-lime hover:underline">
          Back to digests
        </button>
      </div>
    );
  }

  const deadline = new Date(digest.auto_send_deadline);
  const isPastDeadline = new Date() > deadline;
  const isSent = digest.status === "sent";
  const hasUnsavedChanges = editedText !== digest.summary_text;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/digests")}
            className="text-xs text-muted-foreground hover:text-foreground font-mono mb-2 block"
          >
            ← Back to digests
          </button>
          <h1 className="text-2xl font-display tracking-wide text-foreground uppercase">
            Week of {digest.week_of}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded px-2 py-0.5 text-xs font-mono ${
              isSent
                ? "bg-[rgba(198,215,81,0.1)] text-lime"
                : digest.status === "approved"
                  ? "bg-[var(--blue-10)] text-blue"
                  : "bg-[var(--high-10)] text-high"
            }`}
          >
            {digest.status}
          </span>
          {!isSent && (
            <p className={`text-xs font-mono ${isPastDeadline ? "text-destructive" : "text-muted-foreground"}`}>
              {isPastDeadline
                ? "Past auto-send deadline"
                : `Auto-send: ${deadline.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} 12pm ET`}
            </p>
          )}
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-mono ${
            message.type === "success"
              ? "bg-[rgba(198,215,81,0.1)] text-lime"
              : "bg-[rgba(239,68,68,0.1)] text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Editor / Preview toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowPreview(false)}
          className={`rounded-md px-3 py-1.5 text-xs font-mono transition-colors ${
            !showPreview ? "bg-[var(--lime-10)] text-lime" : "text-muted-foreground hover:bg-[var(--muted-30)]"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`rounded-md px-3 py-1.5 text-xs font-mono transition-colors ${
            showPreview ? "bg-[var(--lime-10)] text-lime" : "text-muted-foreground hover:bg-[var(--muted-30)]"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Editor or preview */}
      {showPreview ? (
        <div className="rounded-lg border border-card-subtle bg-[#0f172a] p-6 mb-6">
          <div className="mx-auto max-w-[560px]">
            <div className="text-center mb-6">
              <span className="text-3xl">🛸</span>
              <h2 className="text-lg font-semibold text-foreground mt-2">
                Disclosure Watch — Weekly Digest
              </h2>
              <p className="text-xs text-muted-foreground font-mono">Week of {digest.week_of}</p>
            </div>
            <div className="rounded-lg bg-[#1e293b] p-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {editedText}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          disabled={isSent}
          rows={10}
          className="w-full rounded-lg border border-card-subtle bg-card px-4 py-3 text-sm text-foreground leading-relaxed resize-y focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime disabled:opacity-60 mb-6"
          placeholder="Write the weekly digest summary..."
        />
      )}

      {/* Unsaved indicator */}
      {hasUnsavedChanges && !isSent && (
        <p className="text-xs text-high font-mono mb-4">Unsaved changes</p>
      )}

      {/* Actions */}
      {!isSent && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="rounded-lg border border-card-subtle bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[var(--muted-30)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Edits"}
          </button>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="rounded-lg bg-[var(--blue-10)] px-5 py-2.5 text-sm font-medium text-blue transition-colors hover:bg-[rgba(0,133,245,0.2)] disabled:opacity-50"
          >
            {digest.status === "approved" ? "Re-approve" : "Approve for Send"}
          </button>
          <button
            onClick={handleSendNow}
            disabled={sending}
            className="rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Now"}
          </button>
        </div>
      )}

      {isSent && digest.sent_at && (
        <p className="text-sm text-muted-foreground font-mono">
          Sent on {new Date(digest.sent_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}

      {/* Paid content section */}
      {digest.status !== "draft" && (
        <div className="mt-12 pt-8 border-t border-card-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display tracking-wide text-foreground uppercase">
              Paid Subscriber Content
            </h2>
            <span className="text-xs font-mono text-muted-foreground bg-[var(--muted-50)] px-2 py-0.5 rounded">
              Coming soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Extended analysis for paid subscribers will be editable here once the paid tier is enabled.
          </p>
        </div>
      )}
    </div>
  );
}
