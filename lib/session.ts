import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Resolves the dw_alerts_session cookie to a verified email address.
 * Returns null if the session is invalid or expired.
 */
export async function getSessionEmail(req: NextRequest): Promise<string | null> {
  const sessionToken = req.cookies.get("dw_alerts_session")?.value;
  if (!sessionToken) return null;

  const { data: row } = await supabase
    .from("email_verification_codes")
    .select("email, session_expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!row || !row.session_expires_at || new Date(row.session_expires_at) < new Date()) {
    return null;
  }

  return row.email;
}
