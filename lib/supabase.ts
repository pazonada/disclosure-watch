import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Server-side Supabase client (lazy-initialized, service role).
 *
 * Every PostgREST read is opted out of Next.js's data cache. Supabase JS
 * uses the global `fetch()`, which Next.js patches to memoize GET
 * responses; without this override, /api/admin/subscribers and other
 * read paths served stale rows for minutes after a write. Writes were
 * fine (POST/PATCH aren't cached) — reads were the leak.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      _supabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, cache: "no-store" }),
        },
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop as string];
  },
});

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
