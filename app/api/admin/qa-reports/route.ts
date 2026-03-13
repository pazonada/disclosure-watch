import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const QA_DIR = path.join(process.cwd(), "content", "qa-reports");

/**
 * GET /api/admin/qa-reports
 *
 * Lists all QA report files, or returns the content of a specific report
 * if ?file=<filename> is provided.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  // Return a specific report's content
  if (file) {
    const safeName = path.basename(file); // prevent path traversal
    const filePath = path.join(QA_DIR, safeName);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({ file: safeName, content });
    } catch {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
  }

  // List all reports
  try {
    if (!fs.existsSync(QA_DIR)) {
      return NextResponse.json({ reports: [] });
    }

    const files = fs.readdirSync(QA_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse(); // newest first

    const reports = files.map((f) => {
      const stat = fs.statSync(path.join(QA_DIR, f));
      const isAlert = f.includes("ALERT");
      return {
        file: f,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        isAlert,
      };
    });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("QA reports list error:", err);
    return NextResponse.json({ error: "Failed to list reports" }, { status: 500 });
  }
}
