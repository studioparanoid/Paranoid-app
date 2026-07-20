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
    <section className="subtle-enter rounded-2xl border border-border bg-surface p-6 text-center">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-success">
        Encomenda recebida
      </p>
      <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
        Obrigado.
      </h1>

      <p className="mt-3 leading-relaxed text-foreground-secondary">
        Recebemos a tua encomenda. Vais receber confirmação por email assim que
        o pagamento for validado.
      </p>

      {order && (
        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-background-subtle p-4 text-left">
          <p className="flex justify-between text-sm text-foreground-muted">
            <span>Número</span>
            <span className="font-black text-foreground">
              #{normalizeOrderId(order.id)}
            </span>
          </p>
          <p className="flex justify-between text-sm text-foreground-muted">
            <span>Estado</span>
            <span>{getOrderStatusLabel(order.orderStatus)}</span>
          </p>
          <p className="flex justify-between text-sm text-foreground-muted">
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
