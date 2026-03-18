import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Disclosure Watch — UAP government disclosure dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "linear-gradient(135deg, #0a0e14 0%, #141c28 50%, #0a0e14 100%)",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(24,30,40,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,30,40,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Lime glow accent */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-120px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(198,215,81,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
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
          {/* Satellite icon */}
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

          {/* Divider */}
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
              color: "rgba(148,163,184,0.9)",
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
              color: "rgba(148,163,184,0.5)",
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
