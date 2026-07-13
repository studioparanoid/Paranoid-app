"use client";

import { useEffect, useState } from "react";
import {
  formatMoney,
  getCartTotals,
  type ShopCartItem,
} from "@/lib/shop";
import { readShopCart, writeShopCart } from "@/lib/shop/cart";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function CartClient() {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    function syncCart() {
      setItems(readShopCart());
    }

    const timer = window.setTimeout(syncCart, 0);

    window.addEventListener("paranoid-shop-cart-updated", syncCart);

    return () => {
      window.clearTimeout(timer);
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
    const removedIndex = items.findIndex((item) => item.productId === productId && item.variant === variant);
    const removedItem = removedIndex >= 0 ? items[removedIndex] : null;
    const nextItems = items.filter(
      (item) => !(item.productId === productId && item.variant === variant)
    );

    writeShopCart(nextItems);
    setItems(nextItems);
    if (removedItem) {
      toast({
        message: "Produto removido.",
        action: {
          label: "Desfazer",
          onClick: () => {
            const restored = [...nextItems];
            restored.splice(removedIndex, 0, removedItem);
            writeShopCart(restored);
            setItems(restored);
          },
        },
      });
    }
  }

  if (items.length === 0) {
    return (
      <section className="subtle-enter rounded-lg border border-zinc-900 bg-zinc-950 p-6">
        <p className="text-zinc-400">O carrinho ainda está vazio.</p>
        <LinkButton href="/loja" className="mt-5">
          Ver loja
        </LinkButton>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={`${item.productId}-${item.variant || "default"}`}
            className="subtle-enter grid grid-cols-[5rem_1fr] gap-4 rounded-lg border border-zinc-900 bg-zinc-950 p-3"
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
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Diminuir quantidade de ${item.name}`}
                    onClick={() =>
                      updateQuantity(item.productId, item.variant, item.quantity - 1)
                    }
                    className="h-10 w-10"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-black">{item.quantity}</span>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Aumentar quantidade de ${item.name}`}
                    disabled={item.quantity >= item.stockQuantity}
                    onClick={() =>
                      updateQuantity(item.productId, item.variant, item.quantity + 1)
                    }
                    className="h-10 w-10 disabled:text-zinc-700"
                  >
                    +
                  </Button>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeItem(item.productId, item.variant)}
                >
                  Remover
                </Button>

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

      <aside className="h-fit rounded-lg border border-zinc-900 bg-zinc-950 p-5">
        <h2 className="text-2xl font-black">Resumo</h2>
        <div className="mt-5 space-y-3 text-sm">
          <p className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalCents)}</span>
          </p>
          <p className="flex justify-between text-zinc-400">
            <span>Envio CTT</span>
            <span>{formatMoney(totals.shippingCents)}</span>
          </p>
          <p className="flex justify-between border-t border-zinc-900 pt-3 text-lg font-black">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents)}</span>
          </p>
          <p className="text-xs font-bold text-zinc-500">
            IVA incluído nos preços apresentados.
          </p>
        </div>

        <LinkButton href="/loja/checkout" size="lg" className="mt-5 flex w-full">
          Finalizar compra
        </LinkButton>
      </aside>
    </section>
  );
}
