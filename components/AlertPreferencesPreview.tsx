/**
 * Read-only preview of the alert preferences UI, shown on the subscribe page
 * to give potential Insiders a sense of what they'll be able to configure.
 */
export default function AlertPreferencesPreview() {
  const triggers = [
    { label: "Government documents", checked: true },
    { label: "Hearings & events", checked: true },
    { label: "Disclosure milestones", checked: true },
    { label: "News articles", checked: false },
  ];

  const sampleKeywords = ["AARO", "Grusch", "reverse engineering"];

  return (
    <div className="relative mb-6 select-none" aria-hidden="true">
      <div className="pointer-events-none rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 opacity-70">
        {/* Trigger toggles */}
        <p className="mb-2.5 text-xs font-medium text-foreground">Alert triggers</p>
        <div className="mb-4 space-y-1.5">
          {triggers.map(({ label, checked }) => (
            <label key={label} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                readOnly
                tabIndex={-1}
                className="h-3.5 w-3.5 rounded border-[var(--border)] accent-lime"
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>

        {/* Keyword pills */}
        <p className="mb-2 text-xs font-medium text-foreground">Keyword filters</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleKeywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-[var(--lime-10)] px-2.5 py-0.5 text-xs text-lime"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
