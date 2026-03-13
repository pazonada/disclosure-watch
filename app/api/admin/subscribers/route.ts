import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ subscribers: data });
  } catch (err) {
    console.error("Subscribers fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load subscribers" },
      { status: 500 }
    );
  }
}
