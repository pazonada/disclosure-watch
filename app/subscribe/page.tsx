import NewsletterSignup from "@/components/NewsletterSignup";

export const metadata = {
  title: "Subscribe — Disclosure Watch",
  description: "Get a free weekly briefing on UAP government disclosure delivered to your inbox every Friday.",
};

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-white">Subscribe</h1>
      <p className="mb-8 text-slate-400">
        Stay up to date on UAP government disclosure without the noise.
      </p>

      <div className="space-y-8">
        {/* Free weekly digest */}
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-850 to-slate-900 p-6 sm:p-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">📡</span>
            <h2 className="text-xl font-semibold text-white">Weekly briefing</h2>
            <span className="ml-2 rounded-full bg-accent-green/10 px-3 py-0.5 text-xs font-medium text-accent-green">
              Free
            </span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Every Friday, get a concise rundown of the week's UAP disclosure activity — new government
            documents, upcoming hearings, legislative updates, and what it all means. Written for
            busy people who want to stay informed without doom-scrolling.
          </p>
          <NewsletterSignup />
        </div>

        {/* Paid alerts — coming soon */}
        <div className="rounded-2xl border border-slate-700/30 bg-slate-900/50 p-6 sm:p-8 opacity-75">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <h2 className="text-xl font-semibold text-white">Real-time alerts</h2>
            <span className="ml-2 rounded-full bg-accent-blue/10 px-3 py-0.5 text-xs font-medium text-accent-blue">
              Coming soon
            </span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Get notified the moment new documents drop, hearings are announced, or major developments
            break — before the weekly briefing. Choose your cadence (instant, daily, or weekly) and
            filter by topic: whistleblower activity, Congressional hearings, FOIA releases, and more.
          </p>
          <p className="text-sm text-slate-500">
            Includes deeper analysis and context on new documents, plus priority access to new features.
          </p>
        </div>

        {/* Support */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-6 text-center">
          <p className="mb-3 text-sm text-slate-400">
            Disclosure Watch is independently run and community-funded.
          </p>
          <a
            href="https://ko-fi.com/studiocrux"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-pink-500/10 px-5 py-2.5 text-sm font-medium text-pink-400 transition-colors hover:bg-pink-500/20"
          >
            🛸 Support this project on Ko-fi
          </a>
        </div>
      </div>
    </div>
  );
}
