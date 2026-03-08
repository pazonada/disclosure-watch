import SubmissionForm from "@/components/SubmissionForm";

export const metadata = {
  title: "Submit a Tip — Disclosure Watch",
  description: "Flag a document, hearing, or event we may have missed.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Submit a Tip
      </h1>
      <p className="mb-10 max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
        Know about a document, hearing, or event we haven&apos;t covered? Let us
        know below. All submissions are reviewed before publishing.
      </p>

      <div className="max-w-3xl">
        <SubmissionForm />
      </div>
    </div>
  );
}
