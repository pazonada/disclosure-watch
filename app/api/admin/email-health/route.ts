import { NextResponse } from "next/server";
import { getEmailHealthStatus } from "@/lib/email-health";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email-health
 *
 * Read-only diagnostic for the email pipeline. Returns env-var presence,
 * Resend audience state, Supabase subscriber counts, recent digests, and a
 * `flags` array naming detected problems. Empty `flags` = healthy.
 *
 * Gated by the admin session cookie via middleware.ts.
 */
export async function GET() {
  const status = await getEmailHealthStatus();
  return NextResponse.json(status);
}
