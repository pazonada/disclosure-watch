import Link from "next/link";
import { Radio } from "./Icons";

export default function Footer() {
  return (
    <footer className="border-t border-lime bg-[rgba(26,32,48,0.2)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Radio className="h-4 w-4 text-lime" strokeWidth={2} />
            </div>
            <span className="text-sm font-display tracking-wide text-foreground uppercase">
              Disclosure Watch
            </span>
          </div>

          {/* Links — preserved from live site */}
          <div className="flex flex-wrap justify-center gap-4 text-sm font-mono text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/submit" className="hover:text-foreground transition-colors">Know something we missed?</Link>
            <a
              href="https://ko-fi.com/studiocrux"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime hover:text-[rgba(198,215,81,0.8)] transition-colors"
            >
              🛸 Support this project
            </a>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              System operational
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-mono text-[rgba(133,145,160,0.4)]">
          Independent research project · Not affiliated with any government agency
          <br />
          Hero photo by{" "}
          <a href="https://unsplash.com/@nuvaproductions" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
            Javier Miranda
          </a>
          {" "}on Unsplash
        </p>
      </div>
    </footer>
  );
}
