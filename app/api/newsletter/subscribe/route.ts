import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    // -----------------------------------------------------------
    // Supabase integration (uncomment when you set up Supabase)
    // -----------------------------------------------------------
    // import { createClient } from "@supabase/supabase-js";
    //
    // const supabase = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // );
    //
    // const { error } = await supabase
    //   .from("subscribers")
    //   .upsert({ email, subscribed_at: new Date().toISOString() }, { onConflict: "email" });
    //
    // if (error) {
    //   console.error("Supabase error:", error);
    //   return NextResponse.json({ error: "Failed to subscribe." }, { status: 500 });
    // }

    // -----------------------------------------------------------
    // Resend welcome email (uncomment when you set up Resend)
    // -----------------------------------------------------------
    // import { Resend } from "resend";
    // const resend = new Resend(process.env.RESEND_API_KEY);
    //
    // await resend.emails.send({
    //   from: "Disclosure Watch <hello@disclosurewatch.com>",
    //   to: email,
    //   subject: "Welcome to Disclosure Watch",
    //   html: `<h1>You're in!</h1><p>You'll receive a weekly digest of new UAP government releases every Friday.</p>`,
    // });

    // For now, just log it (replace with Supabase when ready)
    console.log(`New subscriber: ${email}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
