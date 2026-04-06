import { NextResponse } from "next/server";
import { getNews } from "@/lib/content";

export const dynamic = "force-dynamic";

/** GET /api/news — returns all news items as JSON */
export async function GET() {
  return NextResponse.json(getNews());
}
