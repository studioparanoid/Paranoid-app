import { AdminGuard } from "@/components/AdminGuard";
import { AdminOverview } from "@/components/AdminOverview";

export default function AdminPage() {
  return <AdminGuard><main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-[#f2f1ec] sm:px-6 lg:px-10 lg:py-10"><section className="mx-auto max-w-7xl"><AdminOverview /></section></main></AdminGuard>;
}
