"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import {
  formatMoney,
  getOrderStatusLabel,
  normalizeOrderId,
  type ShopOrder,
} from "@/lib/shop";
import { readLastShopOrder } from "@/lib/shop/cart";

export function CheckoutSuccessClient() {
  const [order, setOrder] = useState<ShopOrder | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setOrder(readLastShopOrder() as ShopOrder | null), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="subtle-enter rounded-lg border border-zinc-900 bg-zinc-950 p-6">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-green-400">
        Encomenda recebida
      </p>
      <h1 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
        Obrigado.
      </h1>

      <p className="mt-5 leading-relaxed text-zinc-300">
        Recebemos a tua encomenda. Vais receber confirmação por email assim que
        o pagamento for validado.
      </p>

      {order && (
        <div className="mt-6 space-y-3 rounded-2xl border border-zinc-900 bg-black p-4">
          <p className="flex justify-between text-sm text-zinc-400">
            <span>Número</span>
            <span className="font-black text-[#f2f1ec]">
              #{normalizeOrderId(order.id)}
            </span>
          </p>
          <p className="flex justify-between text-sm text-zinc-400">
            <span>Estado</span>
            <span>{getOrderStatusLabel(order.orderStatus)}</span>
          </p>
          <p className="flex justify-between text-sm text-zinc-400">
            <span>Total</span>
            <span>{formatMoney(order.totalCents)}</span>
          </p>
        </div>
      )}

      <LinkButton href="/loja" className="mt-6">
        Voltar à loja
      </LinkButton>
    </section>
  );
}
