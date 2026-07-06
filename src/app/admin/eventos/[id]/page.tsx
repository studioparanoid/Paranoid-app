import Link from "next/link";
import { AdminEventEditClient } from "@/components/AdminEventEditClient";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link href="/admin" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar ao admin
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Admin · Editar evento
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Corrigir sem pedir licença.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Edita dados públicos, imagem, artistas, datas, estado e
              bilheteira do evento.
            </p>
          </div>
        </section>

        <AdminEventEditClient eventId={id} />
      </section>
    </main>
  );
}