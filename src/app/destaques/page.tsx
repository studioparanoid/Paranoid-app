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
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
          Destaques
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
          Destaques sem complicar.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Publicar eventos na Paranoid continua gratuito. Os destaques servem
          apenas para reforçar visibilidade.
        </p>

        <section className="mt-7 grid gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-2xl border border-accent/30 bg-accent/10 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                {product.name}
              </p>
              <h2 className="mt-3 text-2xl font-black leading-none">
                {product.price}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground-secondary">
                {product.text}
              </p>
              <Link
                href="/organizador/destaques"
                className="pressable focus-ring mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-black text-background"
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
