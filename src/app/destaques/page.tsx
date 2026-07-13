import Link from "next/link";

const products = [
  {
    name: "Destaque individual",
    price: "7 €",
    text: "Realça um evento durante 7 dias depois do pagamento confirmado.",
    cta: "Pedir destaque",
  },
  {
    name: "Pack 3 destaques",
    price: "18 €",
    text: "Três créditos para usar em eventos do organizador.",
    cta: "Comprar pack",
  },
  {
    name: "Paranoid Frequency",
    price: "49 € / 30 dias",
    text: "Visibilidade reforçada para todos os eventos elegíveis do organizador.",
    cta: "Ativar Frequency",
  },
];

export default function HighlightsPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Destaques
        </p>
        <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
          Destaques sem complicar.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
          Publicar eventos na Paranoid continua gratuito. Os destaques servem
          apenas para reforçar visibilidade.
        </p>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-[2rem] border border-red-950 bg-red-950/20 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                {product.name}
              </p>
              <h2 className="mt-4 text-4xl font-black leading-none">
                {product.price}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-zinc-300">
                {product.text}
              </p>
              <Link
                href="/organizador/destaques"
                className="mt-6 inline-flex rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
              >
                {product.cta}
              </Link>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
