"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatMoney,
  getCartTotals,
  type ShopCartItem,
} from "@/lib/shop";
import { readShopCart, writeShopCart } from "@/lib/shop/cart";

export function CartClient() {
  const [items, setItems] = useState<ShopCartItem[]>([]);

  useEffect(() => {
    setItems(readShopCart());

    function syncCart() {
      setItems(readShopCart());
    }

    window.addEventListener("paranoid-shop-cart-updated", syncCart);

    return () => {
      window.removeEventListener("paranoid-shop-cart-updated", syncCart);
    };
  }, []);

  const totals = getCartTotals(items);

  function updateQuantity(productId: string, variant: string | undefined, quantity: number) {
    const nextItems = items
      .map((item) =>
        item.productId === productId && item.variant === variant
          ? { ...item, quantity: Math.min(quantity, item.stockQuantity) }
          : item
      )
      .filter((item) => item.quantity > 0);

    writeShopCart(nextItems);
    setItems(nextItems);
  }

  function removeItem(productId: string, variant: string | undefined) {
    const nextItems = items.filter(
      (item) => !(item.productId === productId && item.variant === variant)
    );

    writeShopCart(nextItems);
    setItems(nextItems);
  }

  if (items.length === 0) {
    return (
      <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-6">
        <p className="text-zinc-400">O carrinho ainda está vazio.</p>
        <Link
          href="/loja"
          className="mt-5 inline-block rounded-full bg-[#f2f1ec] px-5 py-3 font-black text-black"
        >
          Ver loja
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={`${item.productId}-${item.variant || "default"}`}
            className="grid grid-cols-[5rem_1fr] gap-4 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-3"
          >
            <div
              className="aspect-square rounded-2xl bg-zinc-900 bg-cover bg-center"
              style={{
                backgroundImage: item.imageUrl
                  ? `url(${item.imageUrl})`
                  : "linear-gradient(135deg,#18181b,#450a0a)",
              }}
            />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black leading-tight">{item.name}</h2>
                  <p className="text-sm text-zinc-500">{item.sellerName}</p>
                  {item.variant && (
                    <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                      {item.variant}
                    </p>
                  )}
                </div>

                <p className="font-black">
                  {formatMoney(item.finalPriceCents * item.quantity)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.variant, item.quantity - 1)
                    }
                    className="h-10 w-10 rounded-full border border-zinc-800 font-black"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.stockQuantity}
                    onClick={() =>
                      updateQuantity(item.productId, item.variant, item.quantity + 1)
                    }
                    className="h-10 w-10 rounded-full border border-zinc-800 font-black disabled:text-zinc-700"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variant)}
                  className="rounded-full border border-red-950 px-4 py-2 text-xs font-black text-red-400"
                >
                  Remover
                </button>

                {item.quantity >= item.stockQuantity && (
                  <p className="w-full text-xs font-bold text-red-400">
                    Stock máximo: {item.stockQuantity}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
        <h2 className="text-2xl font-black">Resumo</h2>
        <div className="mt-5 space-y-3 text-sm">
          <p className="flex justify-between text-zinc-400">
            <span>Subtotal produtos</span>
            <span>{formatMoney(totals.subtotalCents)}</span>
          </p>
          <p className="flex justify-between text-zinc-400">
            <span>Taxa de serviço</span>
            <span>{formatMoney(totals.commissionTotalCents)}</span>
          </p>
          <p className="flex justify-between text-zinc-400">
            <span>Envio</span>
            <span>{formatMoney(totals.shippingCents)}</span>
          </p>
          <p className="flex justify-between border-t border-zinc-900 pt-3 text-lg font-black">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents)}</span>
          </p>
        </div>

        <Link
          href="/loja/checkout"
          className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center font-black text-black"
        >
          Finalizar compra
        </Link>
      </aside>
    </section>
  );
}
