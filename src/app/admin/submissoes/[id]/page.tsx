import { AdminGuard } from "@/components/AdminGuard";
import { AdminSubmissionEditClient } from "@/components/AdminSubmissionEditClient";

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminGuard>
      <AdminSubmissionEditClient submissionId={id} />
    </AdminGuard>
  );
}