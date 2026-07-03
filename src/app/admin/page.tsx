import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminGuard } from "@/components/AdminGuard";
import { getEvents } from "@/lib/events";

export default async function AdminPage() {
  const events = await getEvents();

  return (
    <AdminGuard>
      <AdminDashboardClient events={events} />
    </AdminGuard>
  );
}