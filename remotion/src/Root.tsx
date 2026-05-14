import { Composition, Still } from "remotion";
import { WeeklyReel, weeklyReelSchema } from "./WeeklyReel";
import {
  WeeklyHighlightsCarousel,
  carouselSchema,
} from "./WeeklyHighlightsCarousel";
import {
  SpecialEventReel,
  specialEventReelSchema,
} from "./SpecialEventReel";

const SAMPLE_NEWS_CARDS = [
  {
    tag: "TOP STORY",
    headline: "Pentagon coordinates first UAP file release with the White House",
    summary:
      "The Department of War's UFO office is preparing release of never-before-seen UAP material, marking the first official coordination signal on disclosure timing.",
    source: "Liberation Times",
    date: "Apr 14, 2026",
    mediaFile: null,
    mediaKind: null,
    mediaAttribution: null,
  },
  {
    tag: "CONGRESS",
    headline: "House Oversight Committee demands briefings on missing scientists",
    summary:
      "Congress formally requested briefings from four government agencies about nearly a dozen scientists who have disappeared or died under suspicious circumstances.",
    source: "NewsNation",
    date: "Apr 20, 2026",
    mediaFile: null,
    mediaKind: null,
    mediaAttribution: null,
  },
  {
    tag: "WATCH THIS",
    headline: "RAF Typhoon jets scrambled to intercept unidentified aircraft",
    summary:
      "RAF Typhoon fighters were launched from Lossiemouth after an unidentified aircraft was tracked approaching UK airspace, a rare publicly acknowledged scramble.",
    source: "UK Defence Journal",
    date: "Apr 15, 2026",
    mediaFile: null,
    mediaKind: null,
    mediaAttribution: null,
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Weekly news REEL — long-form vertical MP4 (~54s, 1080x1920).
          Embeds OG images / DVIDS clips per news card when available. */}
      <Composition
        id="WeeklyReel"
        component={WeeklyReel}
        durationInFrames={1620}
        fps={30}
        width={1080}
        height={1920}
        schema={weeklyReelSchema}
        defaultProps={{
          weekOf: "May 4, 2026",
          hookKicker: "THIS WEEK IN UAP",
          hookTitle: "Three stories shaping the disclosure beat.",
          weeklyTakeaway:
            "Congress, the Pentagon, and the FAA all moved on UAP this week. Here's what changed.",
          newsCards: SAMPLE_NEWS_CARDS,
          whatNext:
            "Pentagon's first official UAP file drop is expected within weeks. Watch war.gov/UFO.",
          assetFolder: "weekly-sample",
        }}
      />

      {/* Weekly deep-dive CAROUSEL — still PNGs (1080x1350 IG carousel) */}
      <Still
        id="WeeklyHighlightsCarousel"
        component={WeeklyHighlightsCarousel}
        width={1080}
        height={1350}
        schema={carouselSchema}
        defaultProps={{
          slideIndex: 0,
          weekOf: "April 20, 2026",
          anchor: {
            kind: "news",
            tag: "THE STORY",
            title:
              "Vance says he's 'obsessed' with UFO files, calls aliens 'demons'",
            source: "NewsNation",
            date: "Mar 30, 2026",
            teaser: "The Vice President just made UAP a theological fight.",
            whatHappened:
              "In a podcast interview, VP JD Vance said he has been pushing internally for broader access to classified UAP files, while describing potential non-human intelligences as 'demons.'",
            details: [
              "Vance is now the highest-ranking sitting U.S. official to publicly demand access to UAP archives.",
              "He framed non-human intelligences in explicitly religious terms, breaking with the Pentagon's secular 'anomalous phenomena' language.",
              "Harvard astrophysicist Avi Loeb publicly rejected the framing within 24 hours, warning it would politicize the science.",
            ],
            whyItMatters:
              "Until now, UAP disclosure has been a bipartisan oversight issue. Vance's language pulls it into America's culture war, which changes who shows up to hearings and what kind of evidence gets taken seriously.",
            whatNext:
              "Watch whether the White House clarifies or doubles down before Congress's June briefing deadline.",
            imageUrl: undefined,
          },
        }}
      />

      {/* Special-event REEL — one-off, breaking-news long-form reel (~81s, 9:16).
          Embeds video footage from public-domain government releases. */}
      <Composition
        id="SpecialEventReel"
        component={SpecialEventReel}
        durationInFrames={2430}
        fps={30}
        width={1080}
        height={1920}
        schema={specialEventReelSchema}
        defaultProps={{
          hookKicker: "BREAKING · MAY 8, 2026",
          hookTitle: "The Pentagon just dropped its biggest UAP file release.",
          announcement:
            "The Department of War launched war.gov/UFO and posted 162 declassified files from the FBI, DoD, NASA, and State Department.",
          stats: { files: 162, videos: 28, minutes: 41, agencies: 4 },
          incidents: [
            {
              slug: "pr28-greece-jan-2024",
              file: "pr28-greece-jan-2024.mp4",
              title: "Greece, Jan 2024",
              location: "Greece",
              date: "January 2024",
              caption: "Diamond-shaped object · ~434 knots · short-wave IR only",
            },
          ],
          caveat:
            "The Pentagon's 2024 report still says it has found no evidence of confirmed alien technology.",
          whatNext:
            "More tranches every few weeks. Rep. Anna Paulina Luna says 46 additional whistleblower videos are still pending.",
          assetFolder: "uap-2026-05-08",
        }}
      />
    </>
  );
};
