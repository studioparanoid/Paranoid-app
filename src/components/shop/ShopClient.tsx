"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatMoney,
  type ShopProduct,
} from "@/lib/shop";

type ShopClientProps = {
  products: ShopProduct[];
};

export function ShopClient({ products }: ShopClientProps) {
  const [category, setCategory] = useState("Todas");
  const [seller, setSeller] = useState("Todos");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((item) => item.category)))],
    [products]
  );
  const sellers = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((item) => item.sellerName)))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesSeller = seller === "Todos" || product.sellerName === seller;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sellerName.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSeller && matchesQuery;
    });
  }, [category, products, query, seller]);

  return (
    <div className="space-y-7">
      <section className="sticky top-16 z-20 -mx-5 border-y border-zinc-900 bg-[#0b0b0b]/95 px-5 py-4 backdrop-blur lg:mx-0 lg:rounded lg:border lg:p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar"
            className="rounded-full border border-zinc-800 bg-black px-4 py-3 text-sm font-bold text-[#f2f1ec] outline-none placeholder:text-zinc-600"
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-full border border-zinc-800 bg-black px-4 py-3 text-sm font-bold text-[#f2f1ec] outline-none"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <select
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
            className="rounded-full border border-zinc-800 bg-black px-4 py-3 text-sm font-bold text-[#f2f1ec] outline-none"
          >
            {sellers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Link href={`/loja/${product.slug}`} key={product.id}>
            <article className="group overflow-hidden rounded-[1.5rem] border border-zinc-900 bg-zinc-950 transition hover:border-red-900">
              <div
                className="aspect-[4/5] bg-zinc-900 bg-cover bg-center"
                style={{
                  backgroundImage: product.images[0]
                    ? `url(${product.images[0]})`
                    : "linear-gradient(135deg,#18181b,#450a0a)",
                }}
              />

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-red-600">
                      {product.category}
                    </p>
                    <h2 className="mt-2 text-xl font-black leading-tight">
                      {product.name}
                    </h2>
                  </div>

                  <p className="rounded-full bg-[#f2f1ec] px-3 py-1 text-sm font-black text-black">
                    {formatMoney(product.finalPriceCents)}
                  </p>
                </div>

                <p className="text-sm font-bold text-zinc-500">
                  {product.sellerName}
                </p>

                {product.stockQuantity <= 0 && (
                  <p className="text-sm font-black text-red-500">Esgotado</p>
                )}
              </div>
            </article>
          </Link>
        ))}
      </section>

      {filteredProducts.length === 0 && (
        <p className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-zinc-400">
          Ainda não há produtos com estes filtros.
        </p>
      )}
    </div>
  );
}
