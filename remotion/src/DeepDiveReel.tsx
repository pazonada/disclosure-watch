import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
} from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

// ── Schema ─────────────────────────────────────────────────────────────────

export const deepDiveSchema = z.object({
  documentTitle: z.string(),
  source: z.string(),
  publishedDate: z.string(),
  category: z.string(),
  hook: z.string(),
  whatItIs: z.string(),
  keyPoints: z.array(z.string()),
  whyItMatters: z.string(),
  newsContext: z.string(),
});

type DeepDiveProps = z.infer<typeof deepDiveSchema>;

// ── Brand tokens ───────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0a0e14",
  bgDark: "#050810",
  lime: "#c6d751",
  white: "#ffffff",
  muted: "#94a3b8",
};

const FONTS = {
  logo: "'Special Elite', Georgia, 'Times New Roman', serif",
  body:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Menlo, monospace',
};

const loadFont = async () => {
  const font = new FontFace(
    "Special Elite",
    "url(https://fonts.gstatic.com/s/specialelite/v20/XLYgIZbkc4JPUL5CVArUVL0nhnc.ttf) format('truetype')"
  );
  await font.load();
  document.fonts.add(font);
};

// ── Background ─────────────────────────────────────────────────────────────

const GridBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, ${COLORS.bg} 0%, ${COLORS.bgDark} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(198, 215, 81, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(198, 215, 81, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  </AbsoluteFill>
);

// ── Logo (matches site) ────────────────────────────────────────────────────

const RadioIcon: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#1a2030" />
    <g
      transform="translate(4 4) scale(1)"
      fill="none"
      stroke={COLORS.lime}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1" />
    </g>
  </svg>
);

// ── Scene 1: Hook ──────────────────────────────────────────────────────────

const HookScene: React.FC<{ hook: string }> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90 }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 28,
            color: COLORS.lime,
            letterSpacing: "0.25em",
            marginBottom: 48,
          }}
        >
          DEEP DIVE
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 56,
            color: COLORS.white,
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {hook}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Document title card ───────────────────────────────────────────

const DocumentScene: React.FC<{
  documentTitle: string;
  source: string;
  publishedDate: string;
  category: string;
}> = ({ documentTitle, source, publishedDate, category }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        <div
          style={{
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.15em",
            padding: "10px 22px",
            borderRadius: 4,
            marginBottom: 36,
          }}
        >
          {category.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 60,
            color: COLORS.white,
            lineHeight: 1.2,
            fontWeight: 700,
            marginBottom: 48,
          }}
        >
          {documentTitle}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.muted,
            letterSpacing: "0.05em",
          }}
        >
          {source} · {publishedDate}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: What it is ────────────────────────────────────────────────────

const WhatItIsScene: React.FC<{ whatItIs: string }> = ({ whatItIs }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 40,
          }}
        >
          WHAT IT IS
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 44,
            color: COLORS.white,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {whatItIs}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: Key points (animated bullet list) ─────────────────────────────

const KeyPointsScene: React.FC<{ keyPoints: string[] }> = ({ keyPoints }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <div style={{ opacity }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 50,
          }}
        >
          KEY POINTS
        </div>
        {keyPoints.slice(0, 4).map((point, i) => {
          const itemDelay = 20 + i * 15;
          const itemOpacity = interpolate(
            frame,
            [itemDelay, itemDelay + 15],
            [0, 1],
            { extrapolateRight: "clamp" }
          );
          const itemSlide = interpolate(
            frame,
            [itemDelay, itemDelay + 20],
            [30, 0],
            { extrapolateRight: "clamp" }
          );
          return (
            <div
              key={i}
              style={{
                opacity: itemOpacity,
                transform: `translateX(${itemSlide}px)`,
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 12,
                  height: 12,
                  background: COLORS.lime,
                  borderRadius: 2,
                  marginTop: 18,
                }}
              />
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 36,
                  color: COLORS.white,
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                {point}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: Why it matters ────────────────────────────────────────────────

const WhyItMattersScene: React.FC<{ whyItMatters: string }> = ({ whyItMatters }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 40,
          }}
        >
          WHY IT MATTERS
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 44,
            color: COLORS.white,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {whyItMatters}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 6: News context (what reporters are saying) ────────────────────

const NewsContextScene: React.FC<{ newsContext: string }> = ({ newsContext }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 40,
          }}
        >
          THE COVERAGE
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 40,
            color: COLORS.white,
            lineHeight: 1.4,
            fontWeight: 500,
            fontStyle: "italic",
            borderLeft: `4px solid ${COLORS.lime}`,
            paddingLeft: 32,
          }}
        >
          {newsContext}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 7: Closing wordmark (no fake button) ─────────────────────────────

const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20 } });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(progress, [0, 1], [0.95, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <RadioIcon size={120} />
        </div>
        <div
          style={{
            fontFamily: FONTS.logo,
            fontSize: 56,
            color: COLORS.white,
            letterSpacing: "0.04em",
            lineHeight: 1.1,
            marginBottom: 18,
          }}
        >
          DISCLOSURE WATCH
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.muted,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 80,
          }}
        >
          UAP Intelligence Dashboard
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 48,
            color: COLORS.white,
            fontWeight: 700,
            marginBottom: 24,
            lineHeight: 1.25,
          }}
        >
          The full story is online.
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.lime,
            letterSpacing: "0.1em",
          }}
        >
          disclosurewatch.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ───────────────────────────────────────────────────────

export const DeepDiveReel: React.FC<DeepDiveProps> = ({
  documentTitle,
  source,
  publishedDate,
  category,
  hook,
  whatItIs,
  keyPoints,
  whyItMatters,
  newsContext,
}) => {
  const [handle] = useState(() => delayRender("Loading Special Elite font"));

  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  // 35 seconds total at 30fps = 1050 frames
  // Scene durations:
  //  - Hook:           120 frames (4s)
  //  - Document:       150 frames (5s)
  //  - What it is:     150 frames (5s)
  //  - Key points:     180 frames (6s)
  //  - News coverage:  150 frames (5s)
  //  - Why it matters: 150 frames (5s)
  //  - Closing:        150 frames (5s)
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />

      <Sequence from={0} durationInFrames={120}>
        <HookScene hook={hook} />
      </Sequence>
      <Sequence from={120} durationInFrames={150}>
        <DocumentScene
          documentTitle={documentTitle}
          source={source}
          publishedDate={publishedDate}
          category={category}
        />
      </Sequence>
      <Sequence from={270} durationInFrames={150}>
        <WhatItIsScene whatItIs={whatItIs} />
      </Sequence>
      <Sequence from={420} durationInFrames={180}>
        <KeyPointsScene keyPoints={keyPoints} />
      </Sequence>
      <Sequence from={600} durationInFrames={150}>
        <NewsContextScene newsContext={newsContext} />
      </Sequence>
      <Sequence from={750} durationInFrames={150}>
        <WhyItMattersScene whyItMatters={whyItMatters} />
      </Sequence>
      <Sequence from={900} durationInFrames={150}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
