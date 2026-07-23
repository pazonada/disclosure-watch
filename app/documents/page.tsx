import { getDocuments } from "@/lib/content";
import DocumentFeed from "@/components/DocumentFeed";

export const revalidate = 3600; // ISR: revalidate every hour

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Header */}
      <section className="mb-10">
        <h1
          className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
          style={{ textShadow: "0 0 1px currentColor, 0 0 1px currentColor", WebkitTextStroke: "0.3px currentColor" }}
        >
          All Documents & Releases
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
          Primary government sources: executive orders, congressional hearings,
          AARO reports, FOIA releases, and official statements. Use search and
          filters to find what interests you.
        </p>
      </section>

      {/* Document Feed with Search & Filters */}
      <section>
        <DocumentFeed documents={documents} />
      </section>
    </div>
  );
}
