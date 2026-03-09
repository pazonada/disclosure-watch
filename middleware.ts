import { NextRequest, NextResponse } from "next/server";

/**
 * Protect /admin routes (except /admin/login) with a session cookie.
 * The cookie is set by /api/admin/login after verifying the ADMIN_PASSWORD.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and login API through
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
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
