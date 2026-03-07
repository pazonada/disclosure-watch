import { getDocuments } from "@/lib/content";
import DocumentFeed from "@/components/DocumentFeed";

export const revalidate = 3600; // ISR: revalidate every hour

export default function DocumentsPage() {
  const documents = getDocuments();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="mb-10">
        <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
          All Documents & Releases
        </h1>
        <p className="max-w-2xl text-lg text-slate-400">
          Browse our complete collection of AARO records, congressional hearings,
          FOIA releases, and disclosure announcements. Use search and filters to find
          what interests you.
        </p>
      </section>

      {/* Document Feed with Search & Filters */}
      <section>
        <DocumentFeed documents={documents} />
      </section>
    </div>
  );
}
