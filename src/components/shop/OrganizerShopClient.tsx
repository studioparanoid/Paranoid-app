"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateShopPrice,
  formatMoney,
  getOrderStatusLabel,
  normalizeOrderId,
  type ShopOrder,
} from "@/lib/shop";
import { supabase } from "@/lib/supabase/public";

type SellerProduct = {
  id: string;
  name: string;
  status: string | null;
  stock_quantity: number | null;
  final_price_cents: number | null;
  category: string | null;
};

export function OrganizerShopClient() {
  const [basePrice, setBasePrice] = useState("20");
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, string>>(
    {}
  );
  const [message, setMessage] = useState("");
  const price = calculateShopPrice(Math.round(Number(basePrice || "0") * 100));

  async function loadOrders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão para ver encomendas.");
      return;
    }

    const response = await fetch("/api/shop/orders?scope=seller", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error || "Não consegui carregar encomendas.");
      return;
    }

    setOrders(payload.orders || []);
  }

  async function loadProducts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: sellers } = await supabase
      .from("shop_sellers")
      .select("id")
      .eq("user_id", user.id);
    const sellerIds = (sellers || []).map((seller) => seller.id);

    if (sellerIds.length === 0) {
      setProducts([]);
      return;
    }

    const { data } = await supabase
      .from("shop_products")
      .select("id,name,status,stock_quantity,final_price_cents,category")
      .in("seller_id", sellerIds)
      .order("created_at", { ascending: false });

    setProducts((data || []) as SellerProduct[]);
  }

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const payoutTotal = useMemo(() => {
    return orders.reduce(
      (total, order) =>
        total +
        order.items.reduce((itemTotal, item) => itemTotal + item.payoutAmountCents, 0),
      0
    );
  }, [orders]);

  async function markShipped(orderId: string) {
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão.");
      return;
    }

    const response = await fetch(`/api/shop/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        status: "shipped",
        carrier: "CTT",
        trackingCode: trackingByOrder[orderId] || "",
      }),
    });

    if (!response.ok) {
      setMessage("Não consegui marcar como enviado.");
      return;
    }

    await loadOrders();
    setMessage("Encomenda marcada como enviada.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="space-y-4">
        <div className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
            Produto
          </p>
          <h2 className="mt-3 text-3xl font-black">Submeter merch</h2>

          <form className="mt-6 grid gap-4">
            {[
              ["Nome", "T-shirt edição limitada"],
              ["Categoria", "T-shirts, vinis, zines..."],
              ["Stock", "12"],
              ["Peso aproximado", "250 g"],
              ["Tamanho / cor", "M / Preto"],
            ].map(([label, placeholder]) => (
              <label className="block space-y-2" key={label}>
                <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  {label}
                </span>
                <input
                  placeholder={placeholder}
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
                />
              </label>
            ))}

            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Preço base que queres receber
              </span>
              <input
                value={basePrice}
                onChange={(event) => setBasePrice(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
              />
            </label>

            <button
              type="button"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 font-black text-black"
            >
              Guardar como pendente
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black">Produtos</h2>

          {products.length === 0 && (
            <p className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-zinc-500">
              Ainda não tens produtos ligados à tua loja.
            </p>
          )}

          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
                    {product.category || "Merch"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{product.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {product.status || "sem estado"} · stock{" "}
                    {product.stock_quantity ?? 0}
                  </p>
                </div>
                <p className="rounded-full bg-[#f2f1ec] px-3 py-1 text-sm font-black text-black">
                  {formatMoney(product.final_price_cents || 0)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black">Encomendas</h2>

          {message && (
            <p className="rounded-2xl border border-green-900 bg-green-950/30 p-4 font-bold text-green-200">
              {message}
            </p>
          )}

          {orders.length === 0 && (
            <p className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-zinc-500">
              Ainda não há encomendas.
            </p>
          )}

          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
                    #{normalizeOrderId(order.id)}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {getOrderStatusLabel(order.orderStatus)}
                  </h3>
                </div>
                <p className="rounded-full bg-[#f2f1ec] px-3 py-1 text-sm font-black text-black">
                  {formatMoney(
                    order.items.reduce(
                      (total, item) => total + item.payoutAmountCents,
                      0
                    )
                  )}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.quantity}x {item.productName} ·{" "}
                    {formatMoney(item.payoutAmountCents)}
                  </p>
                ))}
              </div>

              <div className="mt-5 grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  CTT
                </p>
                <input
                  value={trackingByOrder[order.id] || ""}
                  onChange={(event) =>
                    setTrackingByOrder((current) => ({
                      ...current,
                      [order.id]: event.target.value,
                    }))
                  }
                  placeholder="Código de tracking"
                  className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => markShipped(order.id)}
                  className="rounded-full border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300"
                >
                  Marcar como enviado
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Preço final</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex justify-between text-zinc-400">
              <span>Recebes</span>
              <span>{formatMoney(price.basePriceCents)}</span>
            </p>
            <p className="flex justify-between text-zinc-400">
              <span>Taxa de serviço</span>
              <span>{formatMoney(price.commissionCents)}</span>
            </p>
            <p className="flex justify-between border-t border-zinc-900 pt-3 text-lg font-black">
              <span>Cliente vê</span>
              <span>{formatMoney(price.finalPriceCents)}</span>
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">A receber</h2>
          <p className="mt-4 text-4xl font-black">{formatMoney(payoutTotal)}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Embala a encomenda, cola a etiqueta CTT se existir, deposita nos CTT
            e adiciona o código de tracking.
          </p>
        </section>
      </aside>
    </div>
  );
}
