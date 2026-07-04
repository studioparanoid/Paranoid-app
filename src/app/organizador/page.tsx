import { OrganizerDashboardClient } from "@/components/OrganizerDashboardClient";
import { getEvents } from "@/lib/events";

export default async function OrganizerPage() {
  const events = await getEvents();

  return <OrganizerDashboardClient events={events} />;
}