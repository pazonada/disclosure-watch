import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

// ── Schema ─────────────────────────────────────────────────────────────────

const noteworthyDocSchema = z.object({
  title: z.string(),
  source: z.string(),
  category: z.string(),
  whyItMatters: z.string(),
});

const watchItemSchema = z.object({
  headline: z.string(),
  source: z.string(),
  whyItMatters: z.string(),
});

export const carouselSchema = z.object({
  slideIndex: z.number(),
  weekOf: z.string(),
  insights: z.array(z.string()), // 3 punchy single-sentence takeaways
  stats: z.object({
    newDocs: z.number(),
    newNews: z.number(),
    newEvents: z.number(),
  }),
  noteworthyDoc: noteworthyDocSchema,
  watchList: z.array(watchItemSchema), // 2 key news items
});

type CarouselProps = z.infer<typeof carouselSchema>;

// ── Brand tokens ───────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0a0e14",
  bgDark: "#050810",
  lime: "#c6d751",
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

// ── Logo ───────────────────────────────────────────────────────────────────

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

// Standard footer for content slides
const SlideFooter: React.FC<{ pageLabel?: string }> = ({ pageLabel }) => (
  <div
    style={{
      position: "absolute",
      bottom: 60,
      left: 90,
      right: 90,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: FONTS.mono,
      fontSize: 18,
      color: COLORS.muted,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <RadioIcon size={28} />
      <span>disclosurewatch.com</span>
    </div>
    {pageLabel && <span style={{ color: COLORS.lime }}>{pageLabel}</span>}
  </div>
);

// ── Slide 1: Cover ─────────────────────────────────────────────────────────

const CoverSlide: React.FC<{ weekOf: string }> = ({ weekOf }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
    <RadioIcon size={140} />
    <div
      style={{
        fontFamily: FONTS.logo,
        fontSize: 56,
        color: COLORS.white,
        letterSpacing: "0.04em",
        lineHeight: 1.1,
        marginTop: 32,
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
        marginTop: 12,
      }}
    >
      UAP Intelligence Dashboard
    </div>
    <div style={{ width: 100, height: 3, background: COLORS.lime, margin: "60px 0 40px" }} />
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 28,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 24,
      }}
    >
      THIS WEEK IN UAP
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 56,
        color: COLORS.white,
        fontWeight: 700,
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      Week of
      <br />
      {weekOf}
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 60,
        fontFamily: FONTS.mono,
        fontSize: 22,
        color: COLORS.lime,
        letterSpacing: "0.1em",
      }}
    >
      swipe →
    </div>
  </AbsoluteFill>
);

// ── Slide 2-4: Insight slides ──────────────────────────────────────────────

const InsightSlide: React.FC<{
  insight: string;
  number: number;
  total: number;
}> = ({ insight, number, total }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 48,
      }}
    >
      KEY INSIGHT {number}/{total}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 52,
        color: COLORS.white,
        lineHeight: 1.3,
        fontWeight: 600,
      }}
    >
      {insight}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 5: Stats / By the Numbers ────────────────────────────────────────

const StatsSlide: React.FC<{
  newDocs: number;
  newNews: number;
  newEvents: number;
}> = ({ newDocs, newNews, newEvents }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 60,
      }}
    >
      BY THE NUMBERS
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
      <StatRow value={newDocs} label="new documents added to the tracker" />
      <StatRow value={newNews} label="news stories indexed this week" />
      {newEvents > 0 && (
        <StatRow value={newEvents} label="upcoming hearings or events logged" />
      )}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

const StatRow: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 140,
        fontWeight: 800,
        color: COLORS.lime,
        lineHeight: 0.9,
        minWidth: 200,
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

// ── Slide 6: Most Noteworthy Document ─────────────────────────────────────

const NoteworthyDocSlide: React.FC<{
  title: string;
  source: string;
  category: string;
  whyItMatters: string;
}> = ({ title, source, category, whyItMatters }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 32,
      }}
    >
      MOST NOTEWORTHY
    </div>
    <div
      style={{
        display: "inline-block",
        background: COLORS.lime,
        color: COLORS.bg,
        fontFamily: FONTS.mono,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "0.15em",
        padding: "8px 16px",
        borderRadius: 4,
        marginBottom: 24,
        alignSelf: "flex-start",
      }}
    >
      {category.toUpperCase()}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 44,
        color: COLORS.white,
        lineHeight: 1.25,
        fontWeight: 700,
        marginBottom: 28,
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 20,
        color: COLORS.muted,
        letterSpacing: "0.05em",
        marginBottom: 40,
      }}
    >
      via {source}
    </div>
    <div
      style={{
        borderLeft: `4px solid ${COLORS.lime}`,
        paddingLeft: 28,
        fontFamily: FONTS.body,
        fontSize: 30,
        color: COLORS.mutedBright,
        lineHeight: 1.45,
        fontWeight: 500,
        fontStyle: "italic",
      }}
    >
      {whyItMatters}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 7-8: Worth Watching news items ───────────────────────────────────

const WatchSlide: React.FC<{
  headline: string;
  source: string;
  whyItMatters: string;
  number: number;
  total: number;
}> = ({ headline, source, whyItMatters, number, total }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 32,
      }}
    >
      WORTH WATCHING {number}/{total}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 46,
        color: COLORS.white,
        lineHeight: 1.25,
        fontWeight: 700,
        marginBottom: 28,
      }}
    >
      {headline}
    </div>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 20,
        color: COLORS.muted,
        letterSpacing: "0.05em",
        marginBottom: 40,
      }}
    >
      via {source}
    </div>
    <div
      style={{
        borderLeft: `4px solid ${COLORS.lime}`,
        paddingLeft: 28,
        fontFamily: FONTS.body,
        fontSize: 28,
        color: COLORS.mutedBright,
        lineHeight: 1.45,
        fontWeight: 500,
        fontStyle: "italic",
      }}
    >
      {whyItMatters}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Final slide: CTA closing ───────────────────────────────────────────────

const CTASlide: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
    <RadioIcon size={140} />
    <div
      style={{
        fontFamily: FONTS.logo,
        fontSize: 56,
        color: COLORS.white,
        letterSpacing: "0.04em",
        lineHeight: 1.1,
        marginTop: 36,
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
        marginTop: 12,
      }}
    >
      UAP Intelligence Dashboard
    </div>
  </AbsoluteFill>
);

// ── Main carousel slide router ─────────────────────────────────────────────
//
// Slide order:
//  0: Cover
//  1: Insight 1
//  2: Insight 2
//  3: Insight 3
//  4: By the Numbers
//  5: Most Noteworthy Doc
//  6: Worth Watching 1
//  7: Worth Watching 2 (only if watchList has 2+ items)
//  8 (or 7): CTA closing

export const WeeklyHighlightsCarousel: React.FC<CarouselProps> = ({
  slideIndex,
  weekOf,
  insights,
  stats,
  noteworthyDoc,
  watchList,
}) => {
  const [handle] = useState(() => delayRender("Loading Special Elite font"));

  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  // Build slide list dynamically
  const slides: React.ReactNode[] = [
    <CoverSlide key="cover" weekOf={weekOf} />,
  ];

  insights.slice(0, 3).forEach((insight, i) => {
    slides.push(
      <InsightSlide
        key={`insight-${i}`}
        insight={insight}
        number={i + 1}
        total={Math.min(insights.length, 3)}
      />
    );
  });

  slides.push(<StatsSlide key="stats" {...stats} />);
  slides.push(<NoteworthyDocSlide key="noteworthy" {...noteworthyDoc} />);

  watchList.slice(0, 2).forEach((item, i) => {
    slides.push(
      <WatchSlide
        key={`watch-${i}`}
        {...item}
        number={i + 1}
        total={Math.min(watchList.length, 2)}
      />
    );
  });

  slides.push(<CTASlide key="cta" />);

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />
      {slides[slideIndex] || slides[0]}
    </AbsoluteFill>
  );
};
