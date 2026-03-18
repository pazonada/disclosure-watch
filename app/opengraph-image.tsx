import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Disclosure Watch — UAP government disclosure dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const cwd = process.cwd();
  const [imgData, svgData, fontData] = await Promise.all([
    readFile(join(cwd, "public", "images", "earth-hero.jpg")),
    readFile(join(cwd, "app", "icon.svg"), "utf-8"),
    // Older user-agent → Google Fonts serves TTF (not WOFF2).
    // @vercel/og only supports TTF/OTF.
    fetch(
      "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:27.0) Gecko/20100101 Firefox/27.0" } }
    )
      .then((r) => r.text())
      .then((css) => {
        const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
        return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
      })
      .catch(() => null),
  ]);

  const imgBase64 = `data:image/jpeg;base64,${imgData.toString("base64")}`;
  const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(svgData).toString("base64")}`;

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
        {/* Hero image */}
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

        {/* Overlay — dark enough for text but earth still visible */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(180deg, rgba(10,14,20,0.4) 0%, rgba(10,14,20,0.75) 100%)",
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
          {/* Favicon */}
          <img
            src={svgBase64}
            alt=""
            width={56}
            height={56}
            style={{ marginBottom: "20px" }}
          />

          {/* Site name */}
          <div
            style={{
              fontSize: "64px",
              fontFamily: fontData ? "'Special Elite'" : "Georgia, serif",
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
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "740px",
              display: "flex",
            }}
          >
            Track U.S. government UAP disclosure activity: congressional
            hearings, FOIA releases, National Archives records, and milestones.
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: "22px",
              color: "#c6d751",
              marginTop: "28px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
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
      fonts: fontData
        ? [
            {
              name: "Special Elite",
              data: fontData,
              style: "normal" as const,
              weight: 400 as const,
            },
          ]
        : [],
    }
  );
}
