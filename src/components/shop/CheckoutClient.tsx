"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  getCartTotals,
  type ShopCartItem,
} from "@/lib/shop";

const CART_KEY = "paranoid-shop-cart";

function readCart(): ShopCartItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function CheckoutClient() {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const response = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingAddress,
        items,
      }),
    });
    const payload = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error || "Não foi possível preparar o pagamento.");
      return;
    }

    if (payload.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
      return;
    }

    setMessage("Encomenda criada em modo sandbox. O pagamento real fica para o adapter P@Y.ME.");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <form
        onSubmit={submitOrder}
        className="space-y-4 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5"
      >
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Nome
          </span>
          <input
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            required
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Email
          </span>
          <input
            type="email"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Telefone
          </span>
          <input
            value={buyerPhone}
            onChange={(event) => setBuyerPhone(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Morada de envio
          </span>
          <textarea
            value={shippingAddress}
            onChange={(event) => setShippingAddress(event.target.value)}
            required
            rows={5}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? "A preparar..." : "Pagar"}
        </button>

        {message && (
          <p className="rounded-2xl border border-red-900 bg-red-950/40 p-4 font-bold text-red-100">
            {message}
          </p>
        )}
      </form>

      <aside className="h-fit rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
        <h2 className="text-2xl font-black">Encomenda</h2>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <p
              key={`${item.productId}-${item.variant || "default"}`}
              className="flex justify-between gap-4 text-sm text-zinc-400"
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>{formatMoney(item.finalPriceCents * item.quantity)}</span>
            </p>
          ))}
        </div>
        <p className="mt-5 flex justify-between border-t border-zinc-900 pt-4 text-lg font-black">
          <span>Total</span>
          <span>{formatMoney(totals.totalCents)}</span>
        </p>
      </aside>
    </section>
  );
}

