import NewsletterSignup from "@/components/NewsletterSignup";
import SubscribeButton from "@/components/SubscribeButton";
import AlertPreferencesPreview from "@/components/AlertPreferencesPreview";
import { Radio } from "@/components/Icons";

export const metadata = {
  title: "Subscribe — Disclosure Watch",
  description: "Get a free weekly briefing on UAP government disclosure delivered to your inbox every Friday.",
};

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-3 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        Subscribe
      </h1>
      <p className="mb-10 max-w-2xl text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
        Stay up to date on UAP government disclosure without the noise.
      </p>

      {/* Two-column tier cards */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Free weekly digest */}
        <div className="flex flex-col rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
          <div className="mb-1 flex items-center gap-2">
            <Radio className="h-5 w-5 text-lime" strokeWidth={1.5} />
            <h2 className="text-xl font-semibold text-foreground">Weekly briefing</h2>
            <span className="ml-2 rounded-full bg-[var(--lime-10)] px-3 py-0.5 text-xs font-medium text-lime">
              Free
            </span>
          </div>
          <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground font-light">
            Every Friday, get a concise rundown of the week&apos;s UAP disclosure activity — new government
            documents, upcoming hearings, legislative updates, and what it all means. Written for
            busy people who want to stay informed without doom-scrolling.
          </p>
          <NewsletterSignup />
        </div>

        {/* Insider tier */}
        <div className="flex flex-col rounded-lg border border-card-subtle bg-card p-6 sm:p-8">
          <div className="mb-1 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <h2 className="text-xl font-semibold text-foreground">Insider</h2>
            <span className="ml-2 rounded-full bg-[var(--blue-10)] px-3 py-0.5 text-xs font-medium text-blue">
              $5/mo
            </span>
          </div>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground font-light">
            Become an Insider and get notified the moment new documents drop, hearings are announced,
            or major developments break — before the weekly briefing. Filter by type and add keyword
            filters to zero in on what matters to you.
          </p>
          <AlertPreferencesPreview />
          <SubscribeButton />
        </div>
      </div>

      {/* Support — full width */}
      <div className="rounded-lg border border-card-subtle bg-card p-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          Disclosure Watch is independently run and community-funded.
        </p>
        <a
          href="https://ko-fi.com/studiocrux"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[var(--lime-10)] px-5 py-2.5 text-sm font-medium text-lime transition-colors hover:bg-[var(--lime-30)]"
        >
          🛸 Support this project
        </a>
      </div>
    </div>
  );
}
