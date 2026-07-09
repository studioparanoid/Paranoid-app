import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Admin
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Mesa de controlo.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Aprova submissões, gere eventos publicados, arquivados e a rede de
              artistas, espaços e organizadores da Paranoid.
            </p>
          </div>
        </section>

        <Link
          href="/admin/loja"
          className="mt-6 block rounded-[1.5rem] border border-red-950 bg-red-950/25 p-5 transition hover:border-red-800 lg:max-w-xl"
        >
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
            Loja
          </p>
          <p className="mt-2 text-2xl font-black">Aprovar produtos e comissões</p>
          <p className="mt-2 text-sm text-zinc-500">
            Gere aprovação, envios, pagamentos e comissão da Paranoid.
          </p>
        </Link>

        <AdminDashboardClient />
      </section>
    </main>
  );
}
