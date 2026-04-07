import { Composition, Still } from "remotion";
import { WeeklyReel, weeklyReelSchema } from "./WeeklyReel";
import {
  WeeklyHighlightsCarousel,
  carouselSchema,
} from "./WeeklyHighlightsCarousel";
import { DeepDiveReel, deepDiveSchema } from "./DeepDiveReel";

const SAMPLE_HEADLINES = [
  {
    tag: "TOP STORY",
    title: "Vance says he's 'obsessed' with UFO files, calls aliens 'demons'",
    source: "NewsNation",
    date: "Mar 30, 2026",
  },
  {
    tag: "TRENDING",
    title: "Latest 3I/ATLAS mystery: Signs of nuclear fuel",
    source: "NewsNation",
    date: "Mar 29, 2026",
  },
  {
    tag: "OBITUARY",
    title: "UFO expert Nick Pope dies",
    source: "NewsNation",
    date: "Apr 7, 2026",
  },
];

const SAMPLE_SUMMARY =
  "Vice President JD Vance has focused on UFO file access while describing extraterrestrials as 'demons,' drawing criticism from Harvard astrophysicist Avi Loeb. New developments include nuclear fuel signatures linked to the 3I/ATLAS object.";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Animated weekly reel (kept for backwards compatibility / experimentation) */}
      <Composition
        id="WeeklyReel"
        component={WeeklyReel}
        durationInFrames={30 * 25}
        fps={30}
        width={1080}
        height={1920}
        schema={weeklyReelSchema}
        defaultProps={{
          weekOf: "April 6, 2026",
          summary: SAMPLE_SUMMARY,
          headlines: SAMPLE_HEADLINES,
        }}
      />

      {/* Weekly highlights CAROUSEL — rendered as still PNGs (1080x1350 IG carousel) */}
      <Still
        id="WeeklyHighlightsCarousel"
        component={WeeklyHighlightsCarousel}
        width={1080}
        height={1350}
        schema={carouselSchema}
        defaultProps={{
          slideIndex: 0,
          weekOf: "April 6, 2026",
          insights: [
            "VP JD Vance is now the highest-ranking U.S. official publicly demanding access to UFO files.",
            "New nuclear fuel signatures linked to 3I/ATLAS reframe the object as a possible engineered artifact.",
            "Congress's June UAP briefing deadline is forcing federal agencies to commit on the record.",
          ],
          stats: { newDocs: 8, newNews: 12, newEvents: 1 },
          noteworthyDoc: {
            title: "AARO Quarterly UAP Report — Q1 2026",
            source: "AARO",
            category: "Report",
            whyItMatters:
              "First quarterly report under the new disclosure mandate. Includes 47 newly catalogued cases and the agency's first acknowledgment of recurring patterns in commercial pilot reports.",
          },
          watchList: [
            {
              headline: "Vance says he's 'obsessed' with UFO files, calls aliens 'demons'",
              source: "NewsNation",
              whyItMatters:
                "First time a sitting VP has publicly framed UAP as a theological issue, signaling how the disclosure debate may polarize.",
            },
            {
              headline: "Latest 3I/ATLAS mystery: Signs of nuclear fuel",
              source: "NewsNation",
              whyItMatters:
                "If confirmed, would be the first non-terrestrial object showing material evidence of artificial propulsion.",
            },
          ],
        }}
      />

      {/* Deep-dive REEL — animated MP4 deep dive on a single document (9:16) */}
      <Composition
        id="DeepDiveReel"
        component={DeepDiveReel}
        durationInFrames={30 * 35}
        fps={30}
        width={1080}
        height={1920}
        schema={deepDiveSchema}
        defaultProps={{
          documentTitle: "H.R. 5060: UAP Whistleblower Protection Act",
          source: "Congress",
          publishedDate: "September 15, 2025",
          category: "Report",
          hook: "This week, Congress quietly introduced sweeping new protections for UAP whistleblowers.",
          whatItIs:
            "Bipartisan legislation introduced by Reps. Burchett and Luna to codify federal protections for individuals disclosing UAP-related information.",
          keyPoints: [
            "Establishes legal shield for current and former federal employees disclosing UAP information",
            "Creates secure reporting channels through AARO and the IC IG",
            "Mandates retaliation reviews within 60 days",
          ],
          whyItMatters:
            "It's the first standalone whistleblower bill since the 2023 disclosure hearings, signaling Congress is moving from rhetoric to enforcement.",
          newsContext:
            "The Debrief called it 'the first serious legislative attempt to give UAP insiders a way out,' while NewsNation noted Burchett's promise to push for floor votes before the August recess.",
        }}
      />
    </>
  );
};
