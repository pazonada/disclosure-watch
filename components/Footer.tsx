import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-700/50 bg-midnight">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>🛸</span>
            <span>Disclosure Watch — Tracking government disclosure so you don&apos;t have to.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 sm:justify-end">
            <Link href="/about" className="hover:text-slate-300">About</Link>
            <Link href="/submit" className="hover:text-slate-300">Know something we missed?</Link>
<a
              href="https://ko-fi.com/studiocrux"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300"
            >
              🛸 Support this project
            </a>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-600">
          This site aggregates publicly available U.S. government information about UAPs. It is not
          affiliated with any government agency.
        </p>
      </div>
    </footer>
  );
}
