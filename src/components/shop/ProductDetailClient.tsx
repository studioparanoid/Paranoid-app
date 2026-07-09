"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatMoney,
  type ShopCartItem,
  type ShopProduct,
} from "@/lib/shop";

const CART_KEY = "paranoid-shop-cart";

function readCart(): ShopCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(items: ShopCartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("paranoid-shop-cart-updated"));
}

type ProductDetailClientProps = {
  product: ShopProduct;
};

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(product.images[0] || "");
  const [variant, setVariant] = useState(
    product.variants[0]
      ? `${product.variants[0].name}: ${product.variants[0].value}`
      : ""
  );
  const [added, setAdded] = useState(false);

  const canBuy = product.stockQuantity > 0 && product.status === "active";
  const variantOptions = useMemo(
    () =>
      product.variants.map((item) => `${item.name}: ${item.value}`),
    [product.variants]
  );

  function addToCart() {
    if (!canBuy) {
      return;
    }

    const cart = readCart();
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.variant === variant
    );
    const item: ShopCartItem = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sellerName: product.sellerName,
      imageUrl: product.images[0] || null,
      category: product.category,
      quantity: 1,
      basePriceCents: product.basePriceCents,
      commissionCents: product.commissionCents,
      finalPriceCents: product.finalPriceCents,
      variant: variant || undefined,
    };

    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity: cart[existingIndex].quantity + 1,
      };
    } else {
      cart.push(item);
    }

    writeCart(cart);
    setAdded(true);
  }

  return (
    <section className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="space-y-3">
        <div
          className="aspect-square rounded-[1.5rem] border border-zinc-900 bg-zinc-950 bg-cover bg-center"
          style={{
            backgroundImage: selectedImage
              ? `url(${selectedImage})`
              : "linear-gradient(135deg,#18181b,#450a0a)",
          }}
        />

        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((image) => (
              <button
                type="button"
                key={image}
                onClick={() => setSelectedImage(image)}
                className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-800 bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }}
                aria-label="Ver imagem"
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 lg:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
            {product.category}
          </p>
          <h1 className="mt-3 text-4xl font-black leading-none tracking-tight lg:text-6xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm font-bold text-zinc-500">
            por {product.sellerName}
          </p>
        </div>

        <p className="text-3xl font-black text-[#f2f1ec]">
          {formatMoney(product.finalPriceCents)}
        </p>

        <p className="leading-relaxed text-zinc-300">{product.description}</p>

        <div className="rounded-2xl border border-zinc-900 bg-black p-4 text-sm text-zinc-400">
          <p>
            Artista recebe:{" "}
            <span className="font-black text-[#f2f1ec]">
              {formatMoney(product.basePriceCents)}
            </span>
          </p>
          <p>
            Comissão Paranoid:{" "}
            <span className="font-black text-[#f2f1ec]">
              {formatMoney(product.commissionCents)}
            </span>
          </p>
        </div>

        {variantOptions.length > 0 && (
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Variação
            </span>
            <select
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
              className="w-full rounded-full border border-zinc-800 bg-black px-4 py-3 font-bold text-[#f2f1ec] outline-none"
            >
              {variantOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-black px-4 py-3 text-sm">
          <span className="text-zinc-500">Stock</span>
          <span className="font-black text-[#f2f1ec]">
            {product.stockQuantity > 0 ? `${product.stockQuantity} un.` : "Esgotado"}
          </span>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={!canBuy}
          className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-base font-black text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {canBuy ? "Adicionar ao carrinho" : "Indisponível"}
        </button>

        {added && (
          <div className="grid gap-3 rounded-2xl border border-green-900 bg-green-950/30 p-4">
            <p className="font-bold text-green-300">Produto adicionado.</p>
            <Link
              href="/loja/carrinho"
              className="rounded-full border border-green-800 px-4 py-3 text-center text-sm font-black text-green-200"
            >
              Ver carrinho
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

