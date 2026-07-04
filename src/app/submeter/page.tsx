import { SubmitEventClient } from "@/components/SubmitEventClient";

export default function SubmitEventPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Submeter evento
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Mete a tua cena no mapa.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-zinc-400 lg:text-lg">
              Concertos, festivais, cinema, exposições, mercados, workshops,
              sessões, performances ou qualquer coisa que mereça sair da sombra.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                  Como funciona
                </p>

                <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                  <p>
                    1. Envias os dados do evento.
                  </p>

                  <p>
                    2. A Paranoid revê a submissão.
                  </p>

                  <p>
                    3. Se estiver tudo certo, o evento entra na agenda pública.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-red-500">
                  Dica
                </p>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Quanto melhor o poster, descrição, artistas e informação de
                  preço, melhor aparece na plataforma.
                </p>
              </div>
            </div>
          </div>

          <SubmitEventClient />
        </section>
      </section>
    </main>
  );
}