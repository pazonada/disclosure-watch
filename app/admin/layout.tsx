"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/digests", label: "Digests" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show nav on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Admin header */}
      <div className="mb-8 flex items-center justify-between border-b border-card-subtle pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-lg font-display tracking-wide text-foreground uppercase">
            Admin
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-mono transition-colors ${
                    active
                      ? "bg-[var(--lime-10)] text-lime"
                      : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted-30)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
        >
          ← Back to site
        </Link>
      </div>

      {children}
    </div>
  );
}
