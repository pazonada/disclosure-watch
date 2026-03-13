import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getContacts } from "@/lib/resend";

export const dynamic = "force-dynamic";

/** Pull all contacts from Resend and upsert into Supabase subscribers table. */
export async function POST() {
  try {
    const contacts = await getContacts();

    for (const contact of contacts) {
      await supabase.from("subscribers").upsert(
        {
          email: contact.email,
          status: contact.unsubscribed ? "unsubscribed" : "active",
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
    }

    // Return the full list after sync
    const { data } = await supabase
      .from("subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    return NextResponse.json({
      synced: contacts.length,
      subscribers: data ?? [],
    });
  } catch (err) {
    console.error("Subscriber sync error:", err);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
