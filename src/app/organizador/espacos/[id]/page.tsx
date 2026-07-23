import { OrganizerVenueEditClient } from "@/components/OrganizerVenueEditClient";

export default async function OrganizerVenueEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10 lg:py-10"><section className="mx-auto max-w-3xl"><OrganizerVenueEditClient venueId={id} /></section></main>;
}
