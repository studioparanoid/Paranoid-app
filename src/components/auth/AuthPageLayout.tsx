import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 pb-28 text-[#f2f1ec] sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-3xl space-y-5">{children}</div>
    </main>
  );
}

export function AuthFormCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="content-transition rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-7 lg:p-9">
      <p className="text-xs font-black uppercase tracking-[0.32em] text-red-600">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
        {title}
      </h1>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function AuthInfoCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-900 bg-zinc-950/55 p-5 sm:p-7">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-red-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </section>
  );
}

const networkOptions = [
  { title: "Comunidade", description: "Guarda eventos e segue a cena." },
  { title: "Organizador", description: "Publica e gere eventos." },
  { title: "Artista", description: "Cria o teu perfil e liga-te à rede." },
];

export function AuthNetworkOptions() {
  return (
    <AuthInfoCard eyebrow="Rede" title="Entrar na rede">
      <div className="grid gap-2 sm:grid-cols-3">
        {networkOptions.map((option) => (
          <div
            key={option.title}
            className="rounded border border-zinc-800 bg-black px-4 py-3"
          >
            <p className="font-black text-[#f2f1ec]">{option.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {option.description}
            </p>
          </div>
        ))}
      </div>
    </AuthInfoCard>
  );
}
