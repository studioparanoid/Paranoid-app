import { OrganizerSubmissionEditClient } from "@/components/OrganizerSubmissionEditClient";

export default async function OrganizerSubmissionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizerSubmissionEditClient submissionId={id} />;
}