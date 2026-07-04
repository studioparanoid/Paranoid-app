import { AdminEventEditClient } from "@/components/AdminEventEditClient";
import { AdminGuard } from "@/components/AdminGuard";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <AdminEventEditClient eventId={id} />
    </AdminGuard>
  );
}