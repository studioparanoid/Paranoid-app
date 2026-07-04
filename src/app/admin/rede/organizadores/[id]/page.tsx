import { AdminGuard } from "@/components/AdminGuard";
import { AdminOrganizerEditClient } from "@/components/AdminOrganizerEditClient";

export default async function AdminOrganizerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <AdminOrganizerEditClient organizerId={id} />
    </AdminGuard>
  );
}