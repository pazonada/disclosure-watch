import { NextRequest, NextResponse } from "next/server";
import { removeContact } from "@/lib/resend";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    await removeContact(email);

    // Dual-write to Supabase
    try {
      await supabase
        .from("subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("email", email);
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json({ error: "Failed to unsubscribe." }, { status: 500 });
  }
}

// Also support GET for one-click unsubscribe links in emails
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return new Response("Missing email parameter.", { status: 400 });
  }

  try {
    await removeContact(email);
    await supabase
      .from("subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
  } catch {
    // Non-fatal
  }

  // Redirect to homepage with a friendly message
  return Response.redirect(
    new URL("/?unsubscribed=true", request.nextUrl.origin),
    302
  );
}
