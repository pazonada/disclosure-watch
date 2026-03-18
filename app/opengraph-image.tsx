import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Disclosure Watch — UAP government disclosure dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Read the hero image and convert to base64 data URL
  const imgPath = join(process.cwd(), "public", "images", "earth-hero.jpg");
  const imgData = await readFile(imgPath);
  const imgBase64 = `data:image/jpeg;base64,${imgData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e14",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hero image as background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgBase64}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />

        {/* Dark overlay for text legibility */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(180deg, rgba(10,14,20,0.55) 0%, rgba(10,14,20,0.85) 100%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            position: "relative",
          }}
        >
          {/* Icon */}
          <div
            style={{
              fontSize: "48px",
              marginBottom: "24px",
              display: "flex",
            }}
          >
            🛸
          </div>

          {/* Site name */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.02em",
              textAlign: "center",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            Disclosure Watch
          </div>

          {/* Lime divider */}
          <div
            style={{
              width: "80px",
              height: "3px",
              background: "#c6d751",
              borderRadius: "2px",
              margin: "24px 0",
              display: "flex",
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.8)",
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "700px",
              display: "flex",
            }}
          >
            Track U.S. government UAP disclosure activity. AARO records, hearings, FOIA releases, and milestones.
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "32px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            disclosurewatch.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
