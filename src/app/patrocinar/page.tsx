const products = [
  {
    name: "Paranoid Signal",
    duration: "90 dias",
    text: "Presença base na área de parceiros.",
  },
  {
    name: "Paranoid Noise",
    duration: "180 dias",
    text: "Home, agenda, mapa, região e 3 posts patrocinados.",
  },
  {
    name: "Paranoid Headliner",
    duration: "365 dias",
    text: "Plano anual, 10 posts patrocinados e possibilidade de Parceiro Fundador.",
  },
];

export default function SponsorPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
          Patrocinar
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
          Apoia a cultura que mexe.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Três formatos simples para marcas e parceiros aparecerem na Paranoid.
        </p>

        <section className="mt-7 grid gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                {product.duration}
              </p>
              <h2 className="mt-3 text-2xl font-black leading-none">
                {product.name}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground-secondary">
                {product.text}
              </p>
              <a
                href="mailto:info@paranoid.pt"
                className="pressable focus-ring mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-black text-background"
              >
                Falar com a Paranoid
              </a>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
