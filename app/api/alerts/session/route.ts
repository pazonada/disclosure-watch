import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/alerts/session — Check if the current cookie holds a valid session
 */
export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("dw_alerts_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const { data: row } = await supabase
    .from("email_verification_codes")
    .select("email, session_expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!row || !row.session_expires_at || new Date(row.session_expires_at) < new Date()) {
    // Expired or invalid — clear the cookie
    const response = NextResponse.json({ authenticated: false });
    response.cookies.delete("dw_alerts_session");
    return response;
  }

  return NextResponse.json({ authenticated: true, email: row.email });
}
