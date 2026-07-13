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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Patrocinar
        </p>
        <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
          Apoia a cultura que mexe.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
          Três formatos simples para marcas e parceiros aparecerem na Paranoid.
        </p>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                {product.duration}
              </p>
              <h2 className="mt-4 text-4xl font-black leading-none">
                {product.name}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                {product.text}
              </p>
              <a
                href="mailto:info@paranoid.pt"
                className="mt-6 inline-flex rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
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
