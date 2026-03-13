"use client";

import { useEffect, useState } from "react";

interface ReportMeta {
  file: string;
  size: number;
  modified: string;
  isAlert: boolean;
}

export default function QaReportsPage() {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/qa-reports")
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openReport = async (file: string) => {
    setSelectedReport(file);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/admin/qa-reports?file=${encodeURIComponent(file)}`);
      const data = await res.json();
      setReportContent(data.content || "Report not found.");
    } catch {
      setReportContent("Failed to load report.");
    }
    setContentLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground font-mono animate-pulse">Loading reports...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display tracking-wide text-foreground uppercase mb-2">
          QA Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Automated content audits, link checks, and source health reports from scheduled agents.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-card-subtle bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No reports yet. Reports are generated automatically by scheduled QA agents.
          </p>
          <p className="text-muted-foreground text-xs mt-2 font-mono">
            Content auditor runs daily at 9:30 AM &middot; Link checker runs Sundays at 10 AM
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.file}
              onClick={() => openReport(report.file)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                selectedReport === report.file
                  ? "border-lime bg-[rgba(198,215,81,0.06)]"
                  : "border-card-subtle bg-card hover:bg-[var(--muted-30)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {report.isAlert && (
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[rgba(239,68,68,0.15)] text-destructive uppercase">
                      Alert
                    </span>
                  )}
                  <span className="text-sm text-foreground font-mono">{report.file}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(report.modified).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Report content viewer */}
      {selectedReport && (
        <div className="mt-6 rounded-lg border border-card-subtle bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-subtle bg-[var(--muted-50)]">
            <span className="text-sm font-mono text-foreground">{selectedReport}</span>
            <button
              onClick={() => {
                setSelectedReport(null);
                setReportContent("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              Close
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {contentLoading ? (
              <p className="text-sm text-muted-foreground font-mono animate-pulse">Loading...</p>
            ) : (
              <pre className="text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                {reportContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
