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
      <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-6">
        <h3 className="mb-2 text-lg font-semibold text-accent-green">Thank you!</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Your submission has been received and will be reviewed by our team before being added to
          the site. We appreciate your contribution to making Disclosure Watch more complete.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className="mt-4 text-sm text-accent-green hover:text-accent-green/80 font-medium transition-colors"
        >
          Submit another tip →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-850/50 p-6">
      <h3 className="mb-1 text-lg font-semibold text-white">Know something we missed?</h3>
      <p className="mb-6 text-sm text-slate-400">
        Found a document, event, or timeline entry we haven't covered? Submit a tip and help us
        keep Disclosure Watch complete.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Submission Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">
            Submission type <span className="text-accent-red">*</span>
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors"
          >
            <option value="Missed Document">Missed Document</option>
            <option value="Hearing/Event">Hearing/Event</option>
            <option value="Timeline Event">Timeline Event</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
            Title or headline <span className="text-accent-red">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., AARO Report on 2023 Cases"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
            Description <span className="text-accent-red">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us what this is about and why it's relevant to UAP disclosure..."
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors resize-none"
            required
          />
        </div>

        {/* Link/URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
            Link or URL <span className="text-slate-500 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
            Additional context or notes{" "}
            <span className="text-slate-500 text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any extra details that would help us verify or categorize this submission..."
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors resize-none"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Your email <span className="text-slate-500 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-colors"
          />
          <p className="mt-1 text-xs text-slate-500">
            Provide your email if you'd like us to follow up or give you credit.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-accent-blue px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Submitting..." : "Submit Tip"}
        </button>

        {/* Error Message */}
        {status === "error" && (
          <p className="rounded-lg bg-accent-red/10 px-4 py-3 text-sm text-accent-red">{message}</p>
        )}
      </form>
    </div>
  );
}
