import Link from "next/link";
import { ShopCartLink } from "@/components/shop/ShopCartLink";
import { ShopClient } from "@/components/shop/ShopClient";
import { getActiveShopProducts } from "@/lib/shop";

export default async function ShopPage() {
  const products = await getActiveShopProducts();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
              Loja
            </p>
            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-7xl">
              Merch Paranoid.
            </h1>
            <p className="mt-3 max-w-xl text-sm font-bold text-zinc-500">
              Merch oficial selecionado e gerido pela Paranoid.
            </p>
          </div>

          <ShopCartLink />
        </div>

        <ShopClient products={products} />
      </section>
    </main>
  );
}
