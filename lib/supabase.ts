import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side Supabase client using the service role key. */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ------------------------------------------------------------------ */
/*  Row types (mirrors the SQL schema)                                 */
/* ------------------------------------------------------------------ */

export interface SubscriberRow {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  tier: "free" | "paid";
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface DigestRow {
  id: string;
  week_of: string;
  summary_text: string;
  paid_text: string | null;
  status: "draft" | "approved" | "sent";
  generated_at: string;
  approved_at: string | null;
  sent_at: string | null;
  auto_send_deadline: string;
}
