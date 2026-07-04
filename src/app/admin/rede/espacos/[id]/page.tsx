import { AdminGuard } from "@/components/AdminGuard";
import { AdminVenueEditClient } from "@/components/AdminVenueEditClient";

export default async function AdminVenueEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <AdminVenueEditClient venueId={id} />
    </AdminGuard>
  );
}