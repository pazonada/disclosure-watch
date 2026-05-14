import { AbsoluteFill, Img, continueRender, delayRender } from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

// ── Schema ─────────────────────────────────────────────────────────────────

export const carouselSchema = z.object({
  slideIndex: z.number(),
  weekOf: z.string(),
  anchor: z.object({
    kind: z.enum(["doc", "news"]),
    tag: z.string(),                   // "THE DOC DROP" or "THE STORY"
    title: z.string(),                 // full headline / doc title
    source: z.string(),
    date: z.string(),                  // formatted, e.g. "Apr 18, 2026"
    teaser: z.string(),                // short cover hook, <= 14 words
    whatHappened: z.string(),          // 2-3 sentence setup
    details: z.array(z.string()),      // 3 specific takeaways / quotes / facts
    whyItMatters: z.string(),          // 2-3 sentences of implications
    whatNext: z.string(),              // 1-2 sentences or open question
    imageUrl: z.string().optional(),   // OG image for news anchors
  }),
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

const AnchorTag: React.FC<{ tag: string }> = ({ tag }) => (
  <div
    style={{
      display: "inline-block",
      background: COLORS.lime,
      color: COLORS.bg,
      fontFamily: FONTS.mono,
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: "0.2em",
      padding: "10px 20px",
      borderRadius: 4,
      alignSelf: "flex-start",
    }}
  >
    {tag}
  </div>
);

// ── Slide 1: Cover ─────────────────────────────────────────────────────────

const CoverSlide: React.FC<{
  weekOf: string;
  tag: string;
  teaser: string;
  imageUrl?: string;
}> = ({ weekOf, tag, teaser, imageUrl }) => (
  <AbsoluteFill>
    {imageUrl && (
      <AbsoluteFill>
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
            filter: "grayscale(30%) contrast(1.1)",
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, rgba(10,14,20,0.4) 0%, rgba(10,14,20,0.92) 70%, ${COLORS.bg} 100%)`,
          }}
        />
      </AbsoluteFill>
    )}

    <AbsoluteFill style={{ padding: 90, justifyContent: "space-between" }}>
      {/* Top: brand strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <RadioIcon size={48} />
        <div
          style={{
            fontFamily: FONTS.logo,
            fontSize: 28,
            color: COLORS.white,
            letterSpacing: "0.05em",
          }}
        >
          DISCLOSURE WATCH
        </div>
      </div>

      {/* Middle: teaser */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div
          style={{
            display: "inline-block",
            background: COLORS.lime,
            color: COLORS.bg,
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.2em",
            padding: "12px 22px",
            borderRadius: 4,
            alignSelf: "flex-start",
          }}
        >
          {tag}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 76,
            color: COLORS.white,
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          {teaser}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.lime,
            letterSpacing: "0.2em",
          }}
        >
          WEEK OF {weekOf.toUpperCase()}
        </div>
      </div>

      {/* Bottom: swipe */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 22,
          color: COLORS.lime,
          letterSpacing: "0.1em",
          alignSelf: "flex-end",
        }}
      >
        swipe →
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ── Slide 2: The anchor card (title + source) ─────────────────────────────

const AnchorCardSlide: React.FC<{
  tag: string;
  title: string;
  source: string;
  date: string;
  imageUrl?: string;
  kind: "doc" | "news";
}> = ({ tag, title, source, date, imageUrl, kind }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center", gap: 36 }}>
    <AnchorTag tag={tag} />

    {imageUrl && kind === "news" && (
      <div
        style={{
          width: "100%",
          height: 420,
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    )}

    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 54,
        color: COLORS.white,
        lineHeight: 1.22,
        fontWeight: 800,
      }}
    >
      {title}
    </div>

    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 22,
        color: COLORS.muted,
        letterSpacing: "0.08em",
      }}
    >
      {source} · {date}
    </div>

    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 3: What happened ────────────────────────────────────────────────

const WhatHappenedSlide: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 44,
      }}
    >
      WHAT HAPPENED
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 44,
        color: COLORS.white,
        lineHeight: 1.35,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slides 4-6: Detail slides (one detail each) ────────────────────────────

const DetailSlide: React.FC<{
  text: string;
  number: number;
  total: number;
}> = ({ text, number, total }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 44,
      }}
    >
      THE DETAILS · {number} / {total}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 80,
        color: COLORS.lime,
        fontWeight: 800,
        lineHeight: 1,
        marginBottom: 40,
      }}
    >
      {number.toString().padStart(2, "0")}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 46,
        color: COLORS.white,
        lineHeight: 1.32,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 7: Why it matters ────────────────────────────────────────────────

const WhyItMattersSlide: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 44,
      }}
    >
      WHY IT MATTERS
    </div>
    <div
      style={{
        borderLeft: `4px solid ${COLORS.lime}`,
        paddingLeft: 32,
        fontFamily: FONTS.body,
        fontSize: 44,
        color: COLORS.mutedBright,
        lineHeight: 1.38,
        fontWeight: 500,
        fontStyle: "italic",
      }}
    >
      {text}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 8: What's next ───────────────────────────────────────────────────

const WhatNextSlide: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ padding: 90, justifyContent: "center" }}>
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 26,
        color: COLORS.lime,
        letterSpacing: "0.2em",
        marginBottom: 44,
      }}
    >
      WHAT TO WATCH NEXT
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 44,
        color: COLORS.white,
        lineHeight: 1.32,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
    <SlideFooter pageLabel="swipe →" />
  </AbsoluteFill>
);

// ── Slide 9: CTA closing ───────────────────────────────────────────────────

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
    <div style={{ width: 100, height: 3, background: COLORS.lime, margin: "48px 0" }} />
    <div
      style={{
        fontFamily: FONTS.body,
        fontSize: 40,
        color: COLORS.white,
        fontWeight: 700,
        textAlign: "center",
        maxWidth: 800,
        lineHeight: 1.3,
        marginBottom: 20,
      }}
    >
      More context on every doc drop and headline.
    </div>
    <div
      style={{
        marginTop: 32,
        display: "inline-block",
        background: COLORS.lime,
        color: COLORS.bg,
        fontFamily: FONTS.mono,
        fontSize: 24,
        fontWeight: 700,
        padding: "18px 36px",
        borderRadius: 8,
        letterSpacing: "0.05em",
      }}
    >
      disclosurewatch.com
    </div>
  </AbsoluteFill>
);

// ── Main carousel slide router ─────────────────────────────────────────────
//
// Slide order (9 slides, always):
//  0: Cover (tag + teaser + OG image if news)
//  1: Anchor card (title + source, OG image if news)
//  2: What happened
//  3: Detail 1
//  4: Detail 2
//  5: Detail 3
//  6: Why it matters
//  7: What to watch next
//  8: CTA

export const WeeklyHighlightsCarousel: React.FC<CarouselProps> = ({
  slideIndex,
  weekOf,
  anchor,
}) => {
  const [handle] = useState(() => delayRender("Loading Special Elite font"));

  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  const details = anchor.details.slice(0, 3);

  const slides: React.ReactNode[] = [
    <CoverSlide
      key="cover"
      weekOf={weekOf}
      tag={anchor.tag}
      teaser={anchor.teaser}
      imageUrl={anchor.kind === "news" ? anchor.imageUrl : undefined}
    />,
    <AnchorCardSlide
      key="anchor"
      tag={anchor.tag}
      title={anchor.title}
      source={anchor.source}
      date={anchor.date}
      imageUrl={anchor.imageUrl}
      kind={anchor.kind}
    />,
    <WhatHappenedSlide key="what" text={anchor.whatHappened} />,
    ...details.map((d, i) => (
      <DetailSlide key={`d-${i}`} text={d} number={i + 1} total={details.length} />
    )),
    <WhyItMattersSlide key="why" text={anchor.whyItMatters} />,
    <WhatNextSlide key="next" text={anchor.whatNext} />,
    <CTASlide key="cta" />,
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />
      {slides[slideIndex] || slides[0]}
    </AbsoluteFill>
  );
};
