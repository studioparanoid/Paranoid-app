import { OrganizerEventEditClient } from "@/components/OrganizerEventEditClient";

export default async function OrganizerEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizerEventEditClient eventId={id} />;
}