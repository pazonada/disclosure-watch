import { NextResponse } from "next/server";
import { getWeeklySummary } from "@/lib/content";

export const dynamic = "force-dynamic";

/** GET /api/weekly-summary — returns the current weekly summary */
export async function GET() {
  return NextResponse.json(getWeeklySummary());
}
