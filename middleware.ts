import { NextRequest, NextResponse } from "next/server";

/**
 * Protect /admin routes (except /admin/login) with a session cookie.
 * The cookie is set by /api/admin/login after verifying the ADMIN_PASSWORD.
 *
 * Cron exemption: Vercel-scheduled cron jobs hit /api/admin/* paths with
 * either an `x-vercel-cron-secret` header (set by Vercel's cron runner) or
 * an `Authorization: Bearer <INGEST_SECRET>` header (for manual/external
 * invocations). Without this exemption, the middleware redirects those
 * requests to /admin/login before the route handler can run, and the cron
 * silently never fires. Without this exemption, Vercel may also refuse to
 * register the cron at all because every probe redirects.
 *
 * The route handlers themselves still verify the secret — the middleware
 * exemption just lets the request reach them.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and login API through
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // Cron exemption — only for /api/admin/* paths, only if the request carries
  // a matching secret. The route handler does its own final auth check.
  if (pathname.startsWith("/api/admin/")) {
    const ingestSecret = process.env.INGEST_SECRET;
    if (ingestSecret) {
      const cronHeader = request.headers.get("x-vercel-cron-secret") || "";
      const authHeader = request.headers.get("authorization") || "";
      const cronOk = cronHeader === ingestSecret;
      const bearerOk = authHeader === `Bearer ${ingestSecret}`;
      if (cronOk || bearerOk) {
        return NextResponse.next();
      }
    }
  }

  const token = request.cookies.get("dw_admin")?.value;
  if (!token || token !== process.env.ADMIN_SESSION_SECRET) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
