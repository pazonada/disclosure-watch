import { getDocuments, getEvents, getMilestones, getNews } from "@/lib/content";
import SearchClient from "./SearchClient";

export const revalidate = 3600;

export default async function SearchPage() {
  const [documents, events, milestones, news] = await Promise.all([
    getDocuments(),
    getEvents(),
    getMilestones(),
    getNews(),
  ]);
  return (
    <SearchClient
      documents={documents}
      events={events}
      milestones={milestones}
      news={news}
    />
  );
}
