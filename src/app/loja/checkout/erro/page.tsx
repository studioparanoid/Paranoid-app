import Link from "next/link";

export default function CheckoutErrorPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md rounded-[1.5rem] border border-red-950 bg-red-950/30 p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300">
          Checkout
        </p>
        <h1 className="mt-3 text-4xl font-black leading-none">
          Algo falhou.
        </h1>
        <p className="mt-5 leading-relaxed text-red-100">
          Não conseguimos preparar a encomenda. Volta ao carrinho e tenta outra
          vez.
        </p>
        <Link
          href="/loja/carrinho"
          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-5 py-3 font-black text-black"
        >
          Voltar ao carrinho
        </Link>
      </section>
    </main>
  );
}

