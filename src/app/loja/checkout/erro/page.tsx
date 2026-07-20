import Link from "next/link";

export default function CheckoutErrorPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md rounded-2xl border border-danger/35 bg-danger/10 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-danger">
          Checkout
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight">
          Algo falhou.
        </h1>
        <p className="mt-3 leading-relaxed text-foreground-secondary">
          Não conseguimos preparar a encomenda. Volta ao carrinho e tenta outra
          vez.
        </p>
        <Link
          href="/loja/carrinho"
          className="pressable focus-ring mt-6 inline-block rounded-full bg-foreground px-5 py-3 font-black text-background"
        >
          Voltar ao carrinho
        </Link>
      </section>
    </main>
  );
}

