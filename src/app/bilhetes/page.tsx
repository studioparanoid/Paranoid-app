import Link from "next/link";
import { UserTicketsClient } from "@/components/UserTicketsClient";

export default function UserTicketsPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Bilhetes
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Os teus códigos de entrada.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 lg:text-lg">
              Aqui ficam as tuas reservas e bilhetes da Paranoid. Mostra o
              código à entrada, confirma o estado e guarda tudo num só sítio.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Como funciona
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f2f1ec]">
                  1. Reserva ou compra
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Entras pelo evento e escolhes o bilhete disponível.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f2f1ec]">
                  2. Recebes o código
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  O código fica guardado aqui na tua área de bilhetes.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f2f1ec]">
                  3. Mostras à entrada
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  A organização valida o teu bilhete no evento.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/agenda"
            className="group rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-900 hover:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Agenda
            </p>
            <p className="mt-3 text-xl font-black">Encontrar eventos</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Vê o que está a acontecer e reserva entrada nos eventos ativos.
            </p>
          </Link>

          <Link
            href="/para-ti"
            className="group rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-900 hover:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Para ti
            </p>
            <p className="mt-3 text-xl font-black">Recomendações</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Eventos filtrados pelos teus follows, cidades e categorias.
            </p>
          </Link>

          <Link
            href="/descobrir"
            className="group rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-900 hover:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Rede
            </p>
            <p className="mt-3 text-xl font-black">Descobrir cultura</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Procura artistas, espaços, organizadores e cenas da rede Paranoid.
            </p>
          </Link>
        </section>

        <section className="mt-10">
          <UserTicketsClient />
        </section>
      </section>
    </main>
  );
}