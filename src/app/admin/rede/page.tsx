import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNetworkClient } from "@/components/AdminNetworkClient";

export default function AdminNetworkPage() {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <Link
            href="/admin"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar ao admin
          </Link>

          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
            Rede Paranoid
          </p>

          <h1 className="text-5xl font-black leading-none tracking-tight">
            Alimenta o mapa.
          </h1>

          <p className="mt-5 text-base text-zinc-400">
            Cria e gere artistas, espaços e organizadores que aparecem no
            Descobrir, nos perfis públicos e no feed Para ti.
          </p>

          <AdminNetworkClient />
        </section>
      </main>
    </AdminGuard>
  );
}