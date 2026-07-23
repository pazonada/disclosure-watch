import { getUpcomingEvents, getPastEvents } from "@/lib/content";
import EventsClient from "./EventsClient";

export const revalidate = 3600; // ISR — content fetch is cached separately

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()]);
  return <EventsClient upcoming={upcoming} past={past} />;
}
