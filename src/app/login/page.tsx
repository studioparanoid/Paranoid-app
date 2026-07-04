import { LoginClient } from "@/components/LoginClient";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Entrar
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Volta para dentro da cena.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-zinc-400 lg:max-w-xl lg:text-lg">
              Entra na tua conta para sincronizar guardados, preferências,
              submissões e painel de organizador.
            </p>

            <div className="mt-8 grid gap-3 lg:max-w-xl">
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                  O que ganhas
                </p>

                <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
                  <p>Guardados sincronizados com a tua conta.</p>
                  <p>Feed “Para ti” mais certeiro.</p>
                  <p>Acesso a painel de organizador, se estiver ligado.</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-red-500">
                  Paranoid
                </p>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Uma conta simples. Sem ruído. Só para guardar, submeter e
                  seguir a tua agenda cultural.
                </p>
              </div>
            </div>
          </div>

          <LoginClient />
        </section>
      </section>
    </main>
  );
}