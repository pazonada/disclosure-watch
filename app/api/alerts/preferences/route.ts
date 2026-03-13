import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/alerts/preferences?email=…
 * POST /api/alerts/preferences  { email, preferences }
 *
 * Manages alert preferences for paid subscribers.
 * Uses email as the lookup key (no auth session needed for MVP).
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  // Look up subscriber + check they're paid
  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, tier")
    .eq("email", email)
    .single();

  if (!subscriber || subscriber.tier !== "paid") {
    return NextResponse.json(
      { error: "Paid subscription required." },
      { status: 403 }
    );
  }

  // Get their preferences
  const { data: prefs } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("subscriber_id", subscriber.id)
    .single();

  if (!prefs) {
    // Return defaults
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
    const { email, preferences } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    // Look up subscriber + check they're paid
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("id, tier")
      .eq("email", email)
      .single();

    if (!subscriber || subscriber.tier !== "paid") {
      return NextResponse.json(
        { error: "Paid subscription required." },
        { status: 403 }
      );
    }

    // Validate keywords (max 10, each max 50 chars)
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
    return NextResponse.json(
      { error: "Failed to save preferences." },
      { status: 500 }
    );
  }
}
