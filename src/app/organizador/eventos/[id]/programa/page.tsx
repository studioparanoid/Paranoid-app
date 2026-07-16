import { OrganizerProgramClient } from "@/components/organizer/OrganizerProgramClient";

export default async function OrganizerProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizerProgramClient eventId={id} />;
}
