import { NextRequest, NextResponse } from "next/server";
import { buildDigestEmailHtml } from "@/lib/alert-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/digests/preview
 *
 * Returns the rendered email HTML for a given summary + weekOf.
 * Used by the admin digest editor to show a real email preview.
 */
export async function POST(req: NextRequest) {
  try {
    const { summary, weekOf } = await req.json();

    if (!summary || !weekOf) {
      return NextResponse.json(
        { error: "summary and weekOf required" },
        { status: 400 }
      );
    }

    const weekLabel = new Date(weekOf).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const html = buildDigestEmailHtml(summary, weekLabel).replace(
      "{{email}}",
      "preview%40example.com"
    );

    const subject = `Disclosure Watch Weekly Briefing: Week of ${weekLabel}`;

    return NextResponse.json({ html, subject });
  } catch (err) {
    console.error("Preview error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
