"use client";

import { useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopCartLink } from "@/components/shop/ShopCartLink";
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
    <div className="space-y-6">
      <section className="sticky top-12 z-20 -mx-4 border-y border-border bg-background/96 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4 lg:top-16">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar"
            className="focus-ring h-11 min-w-0 flex-1 rounded-full border border-input-border bg-input px-4 text-sm font-bold text-foreground outline-none placeholder:text-foreground-muted"
          />
          <ShopCartLink />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="focus-ring h-11 w-full rounded-full border border-input-border bg-input px-4 text-sm font-bold text-foreground outline-none"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <select
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
            className="focus-ring h-11 w-full rounded-full border border-input-border bg-input px-4 text-sm font-bold text-foreground outline-none"
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
        <p className="rounded-2xl border border-border bg-surface p-5 text-foreground-muted">
          Ainda não há produtos com estes filtros.
        </p>
      )}
    </div>
  );
}
