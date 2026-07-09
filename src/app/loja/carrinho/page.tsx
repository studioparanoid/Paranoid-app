import { CartClient } from "@/components/shop/CartClient";

export default function CartPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Loja
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Carrinho.
        </h1>

        <CartClient />
      </section>
    </main>
  );
}

