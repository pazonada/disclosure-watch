import { NextResponse } from "next/server";
import { getDocuments } from "@/lib/content";

export const dynamic = "force-dynamic";

/** GET /api/documents — returns all documents as JSON */
export async function GET() {
  return NextResponse.json(await getDocuments());
}
