import {
  AbsoluteFill,
  Img,
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

const newsCardSchema = z.object({
  tag: z.string(),
  headline: z.string(),
  summary: z.string(),
  source: z.string(),
  date: z.string(),
  /** Local filename inside the configured publicDir, or null for typography */
  mediaFile: z.string().nullable(),
  /** "image" | "video" | null */
  mediaKind: z.enum(["image", "video"]).nullable(),
  /** "Source · NewsNation", shown under the media frame */
  mediaAttribution: z.string().nullable(),
});

export const weeklyReelSchema = z.object({
  weekOf: z.string(),
  hookKicker: z.string(),
  hookTitle: z.string(),
  weeklyTakeaway: z.string(),
  newsCards: z.array(newsCardSchema),
  whatNext: z.string(),
  /** Folder under publicDir where mp4/jpg files live, e.g. "weekly-2026-05-04" */
  assetFolder: z.string(),
});

type WeeklyReelProps = z.infer<typeof weeklyReelSchema>;

// ── Brand tokens ──────────────────────────────────────────────────────────

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

const RadioIcon: React.FC<{ size?: number }> = ({ size = 36 }) => (
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

// ── Hook scene ────────────────────────────────────────────────────────────

const HookScene: React.FC<{
  kicker: string;
  title: string;
  weekOf: string;
}> = ({ kicker, title, weekOf }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18 } });
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const slide = interpolate(progress, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <BrandStrip />
      <div
        style={{
          opacity,
          transform: `translateY(${slide}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 24,
            color: COLORS.lime,
            letterSpacing: "0.25em",
            fontWeight: 700,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.white,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 80,
            height: 3,
            background: COLORS.lime,
            marginTop: 12,
          }}
        />
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.muted,
            letterSpacing: "0.1em",
          }}
        >
          WEEK OF {weekOf.toUpperCase()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Weekly takeaway ───────────────────────────────────────────────────────

const TakeawayScene: React.FC<{ text: string }> = ({ text }) => {
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
          THIS WEEK IN UAP
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

// ── News card with media ──────────────────────────────────────────────────

const MediaFrame: React.FC<{
  card: WeeklyReelProps["newsCards"][number];
  assetFolder: string;
}> = ({ card, assetFolder }) => {
  if (card.mediaKind === "video" && card.mediaFile) {
    return (
      <OffthreadVideo
        src={staticFile(`${assetFolder}/${card.mediaFile}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
      />
    );
  }
  if (card.mediaKind === "image" && card.mediaFile) {
    return (
      <Img
        src={staticFile(`${assetFolder}/${card.mediaFile}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  // Typographic fallback — gradient with the source/tag printed large
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #1a2030 0%, ${COLORS.bgDark} 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 26,
          color: COLORS.muted,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        {card.source}
      </div>
      <div
        style={{
          fontFamily: FONTS.logo,
          fontSize: 48,
          color: COLORS.lime,
          letterSpacing: "0.05em",
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {card.tag}
      </div>
    </AbsoluteFill>
  );
};

const NewsCardScene: React.FC<{
  card: WeeklyReelProps["newsCards"][number];
  cardNumber: number;
  totalCards: number;
  assetFolder: string;
}> = ({ card, cardNumber, totalCards, assetFolder }) => {
  const frame = useCurrentFrame();
  const tagOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const mediaOpacity = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });
  const headlineOpacity = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  const summaryOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const summarySlide = interpolate(frame, [40, 60], [16, 0], { extrapolateRight: "clamp" });

  // When no hero image/video was found for the card, switch to a text-led
  // layout: drop the giant empty media box and let the headline + summary
  // fill the visual space with editorial typography. The old behaviour was
  // an 860px black rectangle with tiny SOURCE/TAG floating in it — that read
  // as "media failed to load," not as a designed slide.
  const hasMedia = Boolean(card.mediaFile && card.mediaKind);

  return (
    <AbsoluteFill style={{ background: COLORS.bgDark }}>
      <BrandStrip />

      {/* Tag pill + counter — always at the top */}
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
          {card.tag}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: COLORS.muted,
            letterSpacing: "0.1em",
          }}
        >
          {cardNumber} / {totalCards}
        </div>
      </div>

      {hasMedia ? (
        // ── With-media layout: media block on top, text below ──
        <>
          <div
            style={{
              position: "absolute",
              top: 240,
              left: 80,
              right: 80,
              height: 860,
              borderRadius: 16,
              overflow: "hidden",
              border: `1px solid rgba(255,255,255,0.1)`,
              boxShadow: "0 8px 60px rgba(0,0,0,0.5)",
              background: "#000",
              opacity: mediaOpacity,
            }}
          >
            <MediaFrame card={card} assetFolder={assetFolder} />
          </div>

          {card.mediaAttribution && (
            <div
              style={{
                position: "absolute",
                top: 1110,
                left: 80,
                right: 80,
                opacity: mediaOpacity,
                fontFamily: FONTS.mono,
                fontSize: 16,
                color: COLORS.muted,
                letterSpacing: "0.05em",
              }}
            >
              {card.mediaAttribution}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: 1170,
              left: 80,
              right: 80,
              opacity: headlineOpacity,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 46,
                fontWeight: 800,
                color: COLORS.white,
                lineHeight: 1.18,
              }}
            >
              {card.headline}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: 1390,
              left: 80,
              right: 80,
              opacity: summaryOpacity,
              transform: `translateY(${summarySlide}px)`,
            }}
          >
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
              {card.summary}
            </div>
          </div>
        </>
      ) : (
        // ── Text-led layout: no empty media box, headline fills the slide ──
        <>
          {/* Source/date stamp where the media would have been */}
          <div
            style={{
              position: "absolute",
              top: 270,
              left: 80,
              right: 80,
              opacity: mediaOpacity,
              fontFamily: FONTS.mono,
              fontSize: 22,
              color: COLORS.muted,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {card.source}
          </div>

          {/* Big editorial headline — scales up to use the space the media
              block would have occupied. Roughly 5x larger than the
              with-media headline size. */}
          <div
            style={{
              position: "absolute",
              top: 340,
              left: 80,
              right: 80,
              opacity: headlineOpacity,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 96,
                fontWeight: 800,
                color: COLORS.white,
                lineHeight: 1.06,
                letterSpacing: "-0.01em",
              }}
            >
              {card.headline}
            </div>
          </div>

          {/* Thick lime accent rule separating headline from summary */}
          <div
            style={{
              position: "absolute",
              top: 1180,
              left: 80,
              width: 120,
              height: 6,
              background: COLORS.lime,
              opacity: summaryOpacity,
            }}
          />

          {/* Summary, also scaled up since the slide has room */}
          <div
            style={{
              position: "absolute",
              top: 1230,
              left: 80,
              right: 80,
              opacity: summaryOpacity,
              transform: `translateY(${summarySlide}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 38,
                color: COLORS.mutedBright,
                lineHeight: 1.32,
                fontWeight: 500,
              }}
            >
              {card.summary}
            </div>
          </div>
        </>
      )}
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
// Total: 54s @ 30fps = 1620 frames
//   0-4s    Hook                 120
//   4-9s    Weekly takeaway      150
//   9-45s   4 × news card (9s)  1080
//   45-50s  What's next          150
//   50-54s  CTA                  120

export const WeeklyReel: React.FC<WeeklyReelProps> = ({
  weekOf,
  hookKicker,
  hookTitle,
  weeklyTakeaway,
  newsCards,
  whatNext,
  assetFolder,
}) => {
  const HOOK = 120;
  const TAKEAWAY = 150;
  const CARD = 270;
  const WHATS_NEXT = 150;
  const CTA = 120;

  const [handle] = useState(() => delayRender("Loading Special Elite font"));
  useEffect(() => {
    loadFont()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  const cards = newsCards.slice(0, 4);
  const cardsBlockStart = HOOK + TAKEAWAY;
  const cardsBlockEnd = cardsBlockStart + cards.length * CARD;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <GridBackground />

      <Sequence from={0} durationInFrames={HOOK}>
        <HookScene kicker={hookKicker} title={hookTitle} weekOf={weekOf} />
      </Sequence>

      <Sequence from={HOOK} durationInFrames={TAKEAWAY}>
        <TakeawayScene text={weeklyTakeaway} />
      </Sequence>

      {cards.map((card, i) => (
        <Sequence
          key={i}
          from={cardsBlockStart + i * CARD}
          durationInFrames={CARD}
        >
          <NewsCardScene
            card={card}
            cardNumber={i + 1}
            totalCards={cards.length}
            assetFolder={assetFolder}
          />
        </Sequence>
      ))}

      <Sequence from={cardsBlockEnd} durationInFrames={WHATS_NEXT}>
        <WhatsNextScene text={whatNext} />
      </Sequence>

      <Sequence from={cardsBlockEnd + WHATS_NEXT} durationInFrames={CTA}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
