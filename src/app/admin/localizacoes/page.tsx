import Link from "next/link";
import { AdminLocationsClient } from "@/components/AdminLocationsClient";

export default function AdminLocationsPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-7xl">
        <Link href="/admin" className="mb-6 inline-block text-sm text-foreground-muted">
          ← Voltar ao admin
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-danger">
              Admin
            </p>

            <h1 className="max-w-5xl text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Localizações exatas.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground-muted lg:text-lg">
              Define coordenadas reais da porta para espaços e eventos. Isto
              alimenta o mapa nacional por distância real, sem centros de cidade
              falsos.
            </p>
          </div>

          <div className="rounded-[2rem] border border-border bg-background p-5 lg:p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
              Regra Paranoid
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-border bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f5f5f2]">
                  1. Coordenada real
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                  A latitude/longitude deve apontar para a porta ou entrada do
                  espaço.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f5f5f2]">
                  2. Espaço primeiro
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                  Mete coordenadas nos espaços. Depois os eventos herdam essa
                  localização.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-black/40 p-4">
                <p className="text-sm font-bold text-[#f5f5f2]">
                  3. Sem centros de cidade
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                  Se não houver coordenadas reais, o evento fica sem distância.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <AdminLocationsClient />
        </section>
      </section>
    </main>
  );
}