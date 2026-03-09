import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Subscriber counts
    const { count: totalSubs } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    const { count: activeSubs } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: paidSubs } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("tier", "paid");

    // Digest counts
    const { count: totalDigests } = await supabase
      .from("digests")
      .select("*", { count: "exact", head: true });

    const { count: pendingDigests } = await supabase
      .from("digests")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");

    const { data: latestDigest } = await supabase
      .from("digests")
      .select("week_of")
      .order("week_of", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      subscribers: {
        total: totalSubs ?? 0,
        active: activeSubs ?? 0,
        paid: paidSubs ?? 0,
      },
      digests: {
        total: totalDigests ?? 0,
        pending: pendingDigests ?? 0,
        latestWeek: latestDigest?.week_of ?? null,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
