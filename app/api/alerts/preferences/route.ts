import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/alerts/preferences — Fetch alert preferences for the authenticated subscriber
 * POST /api/alerts/preferences — Save alert preferences
 *
 * Both require a valid dw_alerts_session cookie (set by /api/alerts/verify).
 */
export async function GET(request: NextRequest) {
  const email = await getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, tier")
    .eq("email", email)
    .single();

  if (!subscriber || subscriber.tier !== "paid") {
    return NextResponse.json({ error: "Insider subscription required." }, { status: 403 });
  }

  const { data: prefs } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("subscriber_id", subscriber.id)
    .single();

  if (!prefs) {
    return NextResponse.json({
      trigger_documents: true,
      trigger_hearings: true,
      trigger_milestones: true,
      trigger_news: false,
      keywords: [],
    });
  }

  return NextResponse.json({
    trigger_documents: prefs.trigger_documents,
    trigger_hearings: prefs.trigger_hearings,
    trigger_milestones: prefs.trigger_milestones,
    trigger_news: prefs.trigger_news,
    keywords: prefs.keywords || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const email = await getSessionEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { preferences } = await request.json();

    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("id, tier")
      .eq("email", email)
      .single();

    if (!subscriber || subscriber.tier !== "paid") {
      return NextResponse.json({ error: "Insider subscription required." }, { status: 403 });
    }

    const keywords = (preferences.keywords || [])
      .slice(0, 10)
      .map((k: string) => k.trim().toLowerCase().slice(0, 50))
      .filter((k: string) => k.length > 0);

    await supabase.from("alert_preferences").upsert(
      {
        subscriber_id: subscriber.id,
        trigger_documents: !!preferences.trigger_documents,
        trigger_hearings: !!preferences.trigger_hearings,
        trigger_milestones: !!preferences.trigger_milestones,
        trigger_news: !!preferences.trigger_news,
        keywords,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "subscriber_id" }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save preferences error:", err);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}
