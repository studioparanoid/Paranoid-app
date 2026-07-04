import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
            Admin
          </p>

          <h1 className="text-5xl font-black leading-none tracking-tight">
            Painel Paranoid.
          </h1>

          <p className="mt-5 text-base text-zinc-400">
            Aprova submissões, cria eventos, gere a rede e controla o que está
            publicado.
          </p>

          <AdminDashboardClient />
        </section>
      </main>
    </AdminGuard>
  );
}