"use client";

import { useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { type ShopProduct } from "@/lib/shop";

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

      <CardGrid>
        {filteredProducts.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </CardGrid>

      {filteredProducts.length === 0 && (
        <p className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-zinc-400">
          Ainda não há produtos com estes filtros.
        </p>
      )}
    </div>
  );
}
