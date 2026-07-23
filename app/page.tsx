import {
  getMilestones,
  getNews,
  getOfficialDocuments,
  getPastEvents,
  getUpcomingEvents,
  getWeeklySummary,
} from "@/lib/content";
import HomeClient from "./HomeClient";

export const revalidate = 3600;

export default async function HomePage() {
  const [
    officialDocs,
    upcomingEvents,
    pastEvents,
    milestones,
    newsAll,
    weeklySummary,
  ] = await Promise.all([
    getOfficialDocuments(),
    getUpcomingEvents(),
    getPastEvents(),
    getMilestones(),
    getNews(),
    getWeeklySummary(),
  ]);

  return (
    <HomeClient
      officialDocs={officialDocs}
      upcomingEvents={upcomingEvents}
      pastEvents={pastEvents}
      milestones={milestones}
      newsItems={newsAll.slice(0, 24)}
      weeklySummary={weeklySummary}
      totalDocuments={officialDocs.length}
    />
  );
}
