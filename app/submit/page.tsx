import SubmissionForm from "@/components/SubmissionForm";

export const metadata = {
  title: "Submit a Tip — Disclosure Watch",
  description: "Flag a document, hearing, or event we may have missed.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-3 text-3xl font-bold text-white">Submit a Tip</h1>
      <p className="mb-8 text-slate-400 leading-relaxed">
        Know about a document, hearing, or event we haven&apos;t covered? Let us
        know below. All submissions are reviewed before publishing.
      </p>

      <SubmissionForm />
    </div>
  );
}
