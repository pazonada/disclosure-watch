import Link from "next/link";

export const metadata = {
  title: "About — Disclosure Watch",
  description: "What this project is, why it exists, and where the data comes from.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1
        className="mb-6 text-3xl font-display tracking-wide text-foreground sm:text-4xl uppercase"
        style={{
          textShadow: "0 0 1px currentColor, 0 0 1px currentColor",
          WebkitTextStroke: "0.3px currentColor",
        }}
      >
        About Disclosure Watch
      </h1>

      <div className="max-w-3xl space-y-6 text-sm text-muted-foreground leading-relaxed lg:text-base font-light">
        <p>
          Disclosure Watch is an independent project that aggregates and summarizes publicly available
          U.S. government information about Unidentified Anomalous Phenomena (UAPs). Our goal is
          simple: make it easy for anyone to follow what the government is actually releasing,
          without having to dig through dense PDFs, navigate multiple agency websites, or parse
          legislative text.
        </p>

        <h2 className="text-xl font-semibold text-foreground pt-4">Where the data comes from</h2>
        <p>Everything on this site comes from public, official sources. Our document feed is refreshed automatically from government APIs every six hours.</p>

        <h3 className="text-lg font-medium text-foreground pt-2">Government sources (automated)</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="https://www.archives.gov/research/topics/uaps/rg-615" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              National Archives — Record Group 615
            </a>{" "}
            — The official UAP Records Collection where federal agencies transfer declassified materials.
            We pull new records via the National Archives Catalog API.
          </li>
          <li>
            <a href="https://api.congress.gov/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Congress.gov API
            </a>{" "}
            — We monitor for UAP-related bills, amendments, hearing schedules, and committee actions
            across both chambers.
          </li>
          <li>
            <a href="https://www.aaro.mil/UAP-Records/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              AARO (All-domain Anomaly Resolution Office)
            </a>{" "}
            — The Pentagon&apos;s official UAP investigation office. We track their case resolutions,
            imagery releases, annual reports, and congressional testimony.
          </li>
        </ul>

        <h3 className="text-lg font-medium text-foreground pt-2">Government sources (curated)</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="https://www.dni.gov/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Office of the Director of National Intelligence (ODNI)
            </a>{" "}
            — Annual consolidated UAP reports and preliminary assessments.
          </li>
          <li>
            <a href="https://www.energy.gov/nnsa/uapufo-resources-and-documents" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Department of Energy / NNSA
            </a>{" "}
            — UAP documents related to nuclear site incursions and security incidents.
          </li>
          <li>
            <a href="https://www.noaa.gov/information-technology/foia-reading-room/unidentified-anomalous-phenomena-uap-and-aaro-records" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              NOAA FOIA Reading Room
            </a>{" "}
            — UAP records and correspondence with AARO.
          </li>
          <li>
            <a href="https://www.nrc.gov/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Nuclear Regulatory Commission (NRC)
            </a>{" "}
            — UAP records transferred to NARA from nuclear regulatory facilities.
          </li>
          <li>
            <a href="https://www.faa.gov/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Federal Aviation Administration (FAA)
            </a>{" "}
            — UAP reporting procedures and air traffic control notices.
          </li>
          <li>
            <a href="https://science.nasa.gov/uap/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              NASA UAP Research
            </a>{" "}
            — Independent study team reports and the institutional UAP science program.
          </li>
        </ul>

        <h3 className="text-lg font-medium text-foreground pt-2">News and media</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="https://www.newsnationnow.com/tag/ufo/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              NewsNation
            </a>{" "}
            — Ongoing video and investigative coverage of UAP developments.
          </li>
          <li>
            <a href="https://thedebrief.org/category/news/uap-ufo/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              The Debrief
            </a>{" "}
            — In-depth investigative reporting on UAP science and government transparency.
          </li>
          <li>
            <a href="https://defensescoop.com/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              DefenseScoop
            </a>{" "}
            — Pentagon and defense community reporting on AARO and military encounters.
          </li>
          <li>
            <a href="https://www.liberationtimes.com/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Liberation Times
            </a>{" "}
            — Independent journalism on UAP transparency and government accountability.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground pt-4">Related resources</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="https://www.theblackvault.com/documentarchive/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              The Black Vault
            </a>
            {" "} — Comprehensive independent archive of declassified UAP/UFO documents
          </li>
          <li>
            <a href="https://enigmalabs.io/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              Enigma Labs
            </a>
            {" "} — A sighting database and research platform
          </li>
          <li>
            <a href="https://nuforc.org/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              NUFORC
            </a>
            {" "} — The National UFO Reporting Center
          </li>
          <li>
            <a href="https://www.mufon.com/" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline">
              MUFON
            </a>
            {" "} — Mutual UFO Network
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground pt-4">How we rate importance</h2>
        <p>
          Every document and milestone on Disclosure Watch is scored as High, Medium, or Low importance.
          These ratings are based on a weighted assessment of several factors: the directness of the
          source (firsthand testimony scores higher than secondhand reporting), legislative impact
          (signed legislation scores higher than introduced bills), historical significance (first-of-its-kind
          events score higher than follow-ups), the breadth of media and Congressional attention received,
          and recency. Ratings are reviewed periodically as new context emerges. They reflect editorial
          judgment informed by these criteria — not official government classifications.
        </p>

        <h2 className="text-xl font-semibold text-foreground pt-4">What this is not</h2>
        <p>
          This is not a sighting tracker, a forum for personal experiences, or a conspiracy site. We
          don&apos;t speculate — we summarize what the government has officially released and let you
          draw your own conclusions.
        </p>

        <h2 className="text-xl font-semibold text-foreground pt-4">Want to contribute?</h2>
        <p>
          Know about a document, hearing, or event we haven&apos;t covered?{" "}
          <Link href="/submit" className="text-lime hover:underline transition-colors">
            Submit a tip
          </Link>{" "}
          and we&apos;ll review it. This is a community project and contributions are welcome.
        </p>
      </div>
    </div>
  );
}
