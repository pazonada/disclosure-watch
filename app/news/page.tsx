import { getNews } from "@/lib/content";
import NewsFeed from "@/components/NewsFeed";

export const revalidate = 3600; // ISR: revalidate every hour

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Header */}
      <section className="mb-10">
        <h1
          className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
          style={{ textShadow: "0 0 1px currentColor, 0 0 1px currentColor", WebkitTextStroke: "0.3px currentColor" }}
        >
          News & Media Coverage
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
          External coverage from trusted outlets tracking UAP disclosure
          developments. Use search and filters to find what interests you.
        </p>
        <p className="mt-2 text-xs text-muted-foreground italic">
          External sources. Disclosure Watch is not affiliated with any of these outlets.
        </p>
      </section>

      {/* News Feed with Search & Filters */}
      <section>
        <NewsFeed news={news} />
      </section>
    </div>
  );
}
