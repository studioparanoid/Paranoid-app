import { AdminGuard } from "@/components/AdminGuard";
import { AdminArtistEditClient } from "@/components/AdminArtistEditClient";

export default async function AdminArtistEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <AdminArtistEditClient artistId={id} />
    </AdminGuard>
  );
}