import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
} from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

// ── Schema ─────────────────────────────────────────────────────────────────

const incidentSchema = z.object({
  slug: z.string(),
  file: z.string(),
  title: z.string(),
  location: z.string(),
  date: z.string(),
  caption: z.string(),
});

export const specialEventReelSchema = z.object({
  /** Headline framing for the day */
  hookKicker: z.string(),
  hookTitle: z.string(),
  /** Top-line announcement */
  announcement: z.string(),
  /** Stat block values */
  stats: z.object({
    files: z.number(),
    videos: z.number(),
    minutes: z.number(),
    agencies: z.number(),
  }),
  /** Per-incident cards (rendered in order) */
  incidents: z.array(incidentSchema),
  /** Cautionary follow-up text */
  caveat: z.string(),
  /** What to watch for next */
  whatNext: z.string(),
  /** Folder under publicDir where the mp4s live, e.g. "uap-2026-05-08" */
  assetFolder: z.string(),
});

type Props = z.infer<typeof specialEventReelSchema>;

// ── Brand tokens ──────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0a0e14",
  bgDark: "#050810",
  lime: "#c6d751",
  red: "#f87171",
  white: "#ffffff",
  muted: "#94a3b8",
  mutedBright: "#cbd5e1",
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

const RadioIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
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

const BrandStrip: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 60,
      left: 80,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}
  >
    <RadioIcon size={36} />
    <div
      style={{
        fontFamily: FONTS.logo,
        fontSize: 22,
        color: COLORS.white,
        letterSpacing: "0.05em",
      }}
    >
      DISCLOSURE WATCH
    </div>
  </div>
);

// ── Scene 1: Hook ─────────────────────────────────────────────────────────

const HookScene: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18 } });
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const slide = interpolate(progress, [0, 1], [40, 0]);
  const pulse = 0.92 + 0.08 * Math.sin(frame / 6);

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <BrandStrip />
      <div
        style={{
          opacity,
          transform: `translateY(${slide}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            alignSelf: "flex-start",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: COLORS.red,
              opacity: pulse,
              boxShadow: `0 0 22px ${COLORS.red}`,
            }}
          />
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 26,
              color: COLORS.red,
              fontWeight: 700,
              letterSpacing: "0.25em",
            }}
          >
            {kicker}
          </div>
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 88,
            fontWeight: 800,
            color: COLORS.white,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Announcement ─────────────────────────────────────────────────

const AnnouncementScene: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slide = interpolate(frame, [0, 22], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <BrandStrip />
      <div style={{ opacity, transform: `translateY(${slide}px)` }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 36,
          }}
        >
          THE ANNOUNCEMENT
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 50,
            color: COLORS.white,
            lineHeight: 1.28,
            fontWeight: 600,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: Stat block ───────────────────────────────────────────────────

const StatBlockScene: React.FC<{ stats: Props["stats"] }> = ({ stats }) => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const stagger = (i: number) =>
    interpolate(frame, [10 + i * 8, 28 + i * 8], [0, 1], { extrapolateRight: "clamp" });

  const Stat: React.FC<{ value: number | string; label: string; idx: number }> = ({
    value,
    label,
    idx,
  }) => {
    const o = stagger(idx);
    return (
      <div
        style={{
          opacity: o,
          transform: `translateY(${(1 - o) * 18}px)`,
          display: "flex",
          alignItems: "baseline",
          gap: 28,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 130,
            fontWeight: 800,
            color: COLORS.lime,
            lineHeight: 0.9,
            minWidth: 220,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 32,
            color: COLORS.white,
            fontWeight: 500,
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <BrandStrip />
      <div style={{ opacity: headerOpacity, marginBottom: 44 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
          }}
        >
          BY THE NUMBERS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 38 }}>
        <Stat value={stats.files} label="files released" idx={0} />
        <Stat value={stats.videos} label="videos · 41 min total runtime" idx={1} />
        <Stat value={stats.agencies} label="agencies (FBI, DoD, NASA, State)" idx={2} />
      </div>
    </AbsoluteFill>
  );
};

// ── Scene N: Incident card with embedded video ────────────────────────────

const IncidentScene: React.FC<{
  incident: Props["incidents"][number];
  assetFolder: string;
  number: number;
  total: number;
}> = ({ incident, assetFolder, number, total }) => {
  const frame = useCurrentFrame();
  const captionOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDark }}>
      <BrandStrip />

      {/* Centered video frame — pulled up to leave bottom safe zone */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 240,
        }}
      >
        <div
          style={{
            width: 980,
            height: 980,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: "0 8px 60px rgba(0,0,0,0.5)",
            background: "#000",
          }}
        >
          <OffthreadVideo
            src={staticFile(`${assetFolder}/${incident.file}`)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
          />
        </div>
      </AbsoluteFill>

      {/* Header tag */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 80,
          right: 80,
          opacity: tagOpacity,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontFamily: FONTS.mono,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.18em",
            padding: "8px 18px",
            borderRadius: 4,
          }}
        >
          INCIDENT {number} / {total}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: COLORS.muted,
            letterSpacing: "0.1em",
          }}
        >
          {incident.location.toUpperCase()} · {incident.date.toUpperCase()}
        </div>
      </div>

      {/* Caption strip — bottom: 320 leaves a safe zone for IG UI overlays */}
      <div
        style={{
          position: "absolute",
          bottom: 320,
          left: 80,
          right: 80,
          opacity: captionOpacity,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.white,
            lineHeight: 1.25,
            marginBottom: 16,
          }}
        >
          {incident.location}, {incident.date}
        </div>
        <div
          style={{
            borderLeft: `3px solid ${COLORS.lime}`,
            paddingLeft: 20,
            fontFamily: FONTS.body,
            fontSize: 26,
            color: COLORS.mutedBright,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {incident.caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Caveat ────────────────────────────────────────────────────────────────

const CaveatScene: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <BrandStrip />
      <div style={{ opacity }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.red,
            letterSpacing: "0.2em",
            marginBottom: 36,
          }}
        >
          THE CAVEAT
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 46,
            color: COLORS.white,
            lineHeight: 1.32,
            fontWeight: 600,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── What's next ───────────────────────────────────────────────────────────

const WhatsNextScene: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
      <BrandStrip />
      <div style={{ opacity }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
            marginBottom: 36,
          }}
        >
          WHAT TO WATCH NEXT
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 46,
            color: COLORS.white,
            lineHeight: 1.32,
            fontWeight: 600,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── CTA ───────────────────────────────────────────────────────────────────

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 20 } });
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div
        style={{
          opacity,
          transform: `scale(${0.95 + progress * 0.05})`,
          textAlign: "center",
        }}
      >
        <RadioIcon size={130} />
        <div
          style={{
            fontFamily: FONTS.logo,
            fontSize: 46,
            color: COLORS.white,
            letterSpacing: "0.05em",
            marginTop: 28,
          }}
        >
          DISCLOSURE WATCH
        </div>
        <div
          style={{
            marginTop: 36,
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontFamily: FONTS.mono,
            fontSize: 24,
            fontWeight: 700,
            padding: "16px 32px",
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

// ── Main composition ──────────────────────────────────────────────────────
//
// Total: 81s @ 30fps = 2430 frames
//   0-4s    Hook                     120
//   4-10s   Announcement             180
//   10-17s  Stat block               210
//   17-66s  7 × incident card (7s)   1470
//   66-72s  Caveat                   180
//   72-77s  What's next              150
//   77-81s  CTA                      120

export const SpecialEventReel: React.FC<Props> = ({
  hookKicker,
  hookTitle,
  announcement,
  stats,
  incidents,
  caveat,
  whatNext,
  assetFolder,
}) => {
  const HOOK = 120;
  const ANNOUNCE = 180;
  const STATS = 210;
  const INCIDENT = 210;
  const CAVEAT = 180;
  const WHATS_NEXT = 150;
  const CTA = 120;

  const [handle] = useState(() => delayRender("Loading Special Elite font"));
  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  const cards = incidents.slice(0, 7);
  const incidentsBlockStart = HOOK + ANNOUNCE + STATS;
  const incidentsBlockEnd = incidentsBlockStart + cards.length * INCIDENT;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />

      <Sequence from={0} durationInFrames={HOOK}>
        <HookScene kicker={hookKicker} title={hookTitle} />
      </Sequence>

      <Sequence from={HOOK} durationInFrames={ANNOUNCE}>
        <AnnouncementScene text={announcement} />
      </Sequence>

      <Sequence from={HOOK + ANNOUNCE} durationInFrames={STATS}>
        <StatBlockScene stats={stats} />
      </Sequence>

      {cards.map((incident, i) => (
        <Sequence
          key={incident.slug}
          from={incidentsBlockStart + i * INCIDENT}
          durationInFrames={INCIDENT}
        >
          <IncidentScene
            incident={incident}
            assetFolder={assetFolder}
            number={i + 1}
            total={cards.length}
          />
        </Sequence>
      ))}

      <Sequence from={incidentsBlockEnd} durationInFrames={CAVEAT}>
        <CaveatScene text={caveat} />
      </Sequence>

      <Sequence from={incidentsBlockEnd + CAVEAT} durationInFrames={WHATS_NEXT}>
        <WhatsNextScene text={whatNext} />
      </Sequence>

      <Sequence
        from={incidentsBlockEnd + CAVEAT + WHATS_NEXT}
        durationInFrames={CTA}
      >
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
