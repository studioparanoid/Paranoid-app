"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  getCartTotals,
  type ShopCartItem,
} from "@/lib/shop";
import {
  clearShopCart,
  readShopCart,
  saveLastShopOrder,
} from "@/lib/shop/cart";

export function CheckoutClient() {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Portugal");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems(readShopCart());
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
        postalCode,
        city,
        country,
        notes,
        items,
      }),
    });
    const payload = await response.json();

    setLoading(false);

    if (!response.ok) {
      const error = payload.error || "Não foi possível preparar o pagamento.";
      setMessage(error);
      window.location.href = `/loja/checkout/erro?reason=${encodeURIComponent(error)}`;
      return;
    }

    if (payload.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
      return;
    }

    saveLastShopOrder(payload.order);
    clearShopCart();
    window.location.href = `/loja/checkout/sucesso?order=${encodeURIComponent(
      payload.order?.id || payload.paymentReference || "sandbox"
    )}`;
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Código postal
            </span>
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              required
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Localidade
            </span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            País
          </span>
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            required
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Observações
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? "A preparar..." : "Pagar encomenda"}
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
        <div className="mt-5 space-y-3 border-t border-zinc-900 pt-4 text-sm">
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
          <p className="flex justify-between pt-2 text-lg font-black">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents)}</span>
          </p>
        </div>
      </aside>
    </section>
  );
}
