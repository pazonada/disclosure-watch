import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

// Load Special Elite font from Google Fonts at render time
const loadFont = async () => {
  const font = new FontFace(
    "Special Elite",
    "url(https://fonts.gstatic.com/s/specialelite/v20/XLYgIZbkc4JPUL5CVArUVL0nhnc.ttf) format('truetype')"
  );
  await font.load();
  document.fonts.add(font);
};

// ── Schema ─────────────────────────────────────────────────────────────────

const headlineSchema = z.object({
  tag: z.string(),
  title: z.string(),
  source: z.string(),
  date: z.string(),
});

export const weeklyReelSchema = z.object({
  weekOf: z.string(),
  summary: z.string(),
  headlines: z.array(headlineSchema),
});

type WeeklyReelProps = z.infer<typeof weeklyReelSchema>;

// ── Brand tokens (matched to disclosurewatch.com) ─────────────────────────

const COLORS = {
  bg: "#0a0e14",
  bgDark: "#050810",
  lime: "#c6d751",
  white: "#ffffff",
  muted: "#94a3b8",
  cardBorder: "rgba(255,255,255,0.08)",
};

const FONTS = {
  // Site H1: Special Elite (typewriter)
  logo: "'Special Elite', Georgia, 'Times New Roman', serif",
  // Site body: system stack
  body:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  // Mono for tags / dates
  mono: '"JetBrains Mono", "Fira Code", Menlo, monospace',
};

// ── Background with grid overlay ───────────────────────────────────────────

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

// ── Radio waves icon (matches app/icon.svg) ────────────────────────────────

const RadioIcon: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
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

// ── Site logo: icon + Special Elite wordmark ───────────────────────────────

const Logo: React.FC<{ size?: number; layout?: "stacked" | "horizontal" }> = ({
  size = 48,
  layout = "stacked",
}) => {
  const iconSize = size * 1.6;

  if (layout === "horizontal") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <RadioIcon size={iconSize} />
        <div
          style={{
            fontFamily: FONTS.logo,
            fontSize: size,
            color: COLORS.white,
            letterSpacing: "0.04em",
            lineHeight: 1.1,
          }}
        >
          DISCLOSURE WATCH
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <RadioIcon size={iconSize} />
      <div
        style={{
          fontFamily: FONTS.logo,
          fontSize: size,
          color: COLORS.white,
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        DISCLOSURE WATCH
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: size * 0.32,
          color: COLORS.muted,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        UAP Intelligence Dashboard
      </div>
    </div>
  );
};

// ── Scene 1: Title card ────────────────────────────────────────────────────

const TitleScene: React.FC<{ weekOf: string }> = ({ weekOf }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ opacity, transform: `scale(${0.9 + progress * 0.1})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 24,
          }}
        >
          THIS WEEK IN UAP
        </div>
        <Logo size={64} />
        <div
          style={{
            width: 80,
            height: 3,
            background: COLORS.lime,
            margin: "32px auto",
          }}
        />
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 28,
            color: COLORS.muted,
            fontWeight: 500,
          }}
        >
          Week of {weekOf}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 60,
          fontFamily: FONTS.mono,
          fontSize: 18,
          color: COLORS.muted,
          letterSpacing: "0.1em",
        }}
      >
        disclosurewatch.com
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Weekly summary ────────────────────────────────────────────────

const SummaryScene: React.FC<{ summary: string }> = ({ summary }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 32,
          }}
        >
          THE BRIEFING
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 38,
            color: COLORS.white,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {summary}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3+: Headline cards ───────────────────────────────────────────────

const HeadlineScene: React.FC<{
  tag: string;
  title: string;
  source: string;
  date: string;
}> = ({ tag, title, source, date }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const slideUp = interpolate(progress, [0, 1], [60, 0]);

  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${slideUp}px)` }}>
        {/* Lime tag pill */}
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
            marginBottom: 40,
          }}
        >
          {tag}
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 52,
            color: COLORS.white,
            lineHeight: 1.25,
            fontWeight: 700,
            marginBottom: 48,
          }}
        >
          {title}
        </div>

        {/* Source line */}
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 24,
            color: COLORS.muted,
            letterSpacing: "0.05em",
          }}
        >
          {source} · {date}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Final scene: CTA ───────────────────────────────────────────────────────

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ opacity, transform: `scale(${0.95 + progress * 0.05})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 56,
            color: COLORS.white,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Track the truth.
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 28,
            color: COLORS.muted,
            fontWeight: 500,
            marginBottom: 56,
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Government UAP disclosure activity, in plain English.
        </div>
        <Logo size={48} />
        <div
          style={{
            marginTop: 48,
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontFamily: FONTS.mono,
            fontSize: 26,
            fontWeight: 700,
            padding: "20px 40px",
            borderRadius: 8,
            letterSpacing: "0.05em",
          }}
        >
          disclosurewatch.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ───────────────────────────────────────────────────────

export const WeeklyReel: React.FC<WeeklyReelProps> = ({
  weekOf,
  summary,
  headlines,
}) => {
  const SCENE_FRAMES = 90; // 3 seconds per scene at 30fps
  const [handle] = useState(() => delayRender("Loading Special Elite font"));

  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />

      {/* Scene 1: Title (0-3s) */}
      <Sequence from={0} durationInFrames={SCENE_FRAMES}>
        <TitleScene weekOf={weekOf} />
      </Sequence>

      {/* Scene 2: Summary (3-9s) */}
      <Sequence from={SCENE_FRAMES} durationInFrames={SCENE_FRAMES * 2}>
        <SummaryScene summary={summary} />
      </Sequence>

      {/* Scene 3+: Headlines (9-21s, 4s each) */}
      {headlines.slice(0, 3).map((h, i) => (
        <Sequence
          key={i}
          from={SCENE_FRAMES * 3 + i * 120}
          durationInFrames={120}
        >
          <HeadlineScene {...h} />
        </Sequence>
      ))}

      {/* Final scene: CTA (21-25s) */}
      <Sequence from={SCENE_FRAMES * 3 + 360} durationInFrames={120}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
