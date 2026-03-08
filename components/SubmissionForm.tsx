"use client";

import { useState } from "react";

type SubmissionType = "Missed Document" | "Hearing/Event" | "Timeline Event" | "Other";

interface FormData {
  type: SubmissionType;
  title: string;
  url: string;
  description: string;

  notes: string;
  email: string;
}

export default function SubmissionForm() {
  const [formData, setFormData] = useState<FormData>({
    type: "Missed Document",
    title: "",
    url: "",
    description: "",

    notes: "",
    email: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields
    if (!formData.type || !formData.title || !formData.description) {
      setStatus("error");
      setMessage("Please fill in all required fields (type, title, description).");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Thank you for your submission!");
        // Reset form
        setFormData({
          type: "Missed Document",
          title: "",
          url: "",
          description: "",

          notes: "",
          email: "",
        });
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-[var(--lime-10)] bg-[var(--lime-5)] p-6">
        <h3 className="mb-2 text-lg font-semibold text-lime">Thank you!</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your submission has been received and will be reviewed by our team before being added to
          the site. We appreciate your contribution to making Disclosure Watch more complete.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className="mt-4 text-sm text-lime hover:underline font-medium transition-colors"
        >
          Submit another tip →
        </button>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-card-subtle bg-muted px-4 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:border-lime transition-colors";

  return (
    <div className="rounded-lg border border-card-subtle bg-card p-6">
      <h3 className="mb-1 text-lg font-semibold text-foreground">Know something we missed?</h3>
      <p className="mb-6 text-sm text-muted-foreground font-light">
        Found a document, event, or timeline entry we haven&apos;t covered? Submit a tip and help us
        keep Disclosure Watch complete.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Submission Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-2">
            Submission type <span className="text-destructive">*</span>
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Missed Document">Missed Document</option>
            <option value="Hearing/Event">Hearing/Event</option>
            <option value="Timeline Event">Timeline Event</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
            Title or headline <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., AARO Report on 2023 Cases"
            className={inputClass}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-2">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us what this is about and why it's relevant to UAP disclosure..."
            rows={4}
            className={`${inputClass} resize-none`}
            required
          />
        </div>

        {/* Link/URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-muted-foreground mb-2">
            Link or URL <span className="text-xs font-normal">(optional)</span>
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com"
            className={inputClass}
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
            Additional context or notes{" "}
            <span className="text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any extra details that would help us verify or categorize this submission..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
            Your email <span className="text-xs font-normal">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Provide your email if you&apos;d like us to follow up or give you credit.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-lime px-4 py-3 font-medium text-background transition-colors hover:bg-[var(--lime-30)] hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Submitting..." : "Submit Tip"}
        </button>

        {/* Error Message */}
        {status === "error" && (
          <p className="rounded-lg bg-[var(--destructive-10)] px-4 py-3 text-sm text-destructive">{message}</p>
        )}
      </form>
    </div>
  );
}
