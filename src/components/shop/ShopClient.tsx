"use client";

import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopCartLink } from "@/components/shop/ShopCartLink";
import { Input } from "@/components/ui/Input";
import { Reveal } from "@/components/motion/Reveal";
import { fallbackShopCategories, type ShopProduct } from "@/lib/shop";

type ShopClientProps = {
  products: ShopProduct[];
};

export function ShopClient({ products }: ShopClientProps) {
  const [category, setCategory] = useState("Todas");
  const [seller, setSeller] = useState("Todos");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set([...fallbackShopCategories, ...products.map((item) => item.category)])).sort()],
    [products]
  );
  const sellers = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((item) => item.sellerName)))],
    [products]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const vendedor = new URLSearchParams(window.location.search).get("vendedor");
      if (vendedor && products.some((item) => item.sellerName === vendedor)) setSeller(vendedor);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [products]);

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
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar"
            className="min-w-0 flex-1"
          />
          <ShopCartLink />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="focus-ring interactive h-[3.375rem] w-full rounded-lg border border-input-border bg-input px-4 text-base text-foreground outline-none focus:border-[var(--accent)]"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <select
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
            className="focus-ring interactive h-[3.375rem] w-full rounded-lg border border-input-border bg-input px-4 text-base text-foreground outline-none focus:border-[var(--accent)]"
          >
            {sellers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <CardGrid>
        {filteredProducts.map((product, index) => (
          <Reveal key={product.id} delay={Math.min(index * 0.05, 0.25)}>
            <ProductCard product={product} />
          </Reveal>
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
