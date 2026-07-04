import { AdminEventCreateClient } from "@/components/AdminEventCreateClient";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminEventCreatePage() {
  return (
    <AdminGuard>
      <AdminEventCreateClient />
    </AdminGuard>
  );
}