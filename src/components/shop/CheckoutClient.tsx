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
import { LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setItems(readShopCart()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    let response: Response;
    let payload: { error?: string; checkoutUrl?: string; order?: { id?: string }; paymentReference?: string };
    try {
      response = await fetch("/api/shop/checkout", {
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
      payload = await response.json();
    } catch {
      setLoading(false);
      setMessage("Não foi possível ligar ao checkout. Tenta novamente.");
      toast({ message: "Erro de rede. Tenta novamente.", tone: "error" });
      return;
    }

    setLoading(false);

    if (!response.ok) {
      const error = payload.error || "Não foi possível preparar o pagamento.";
      setMessage(error);
      toast({ message: "Não foi possível preparar a encomenda.", tone: "error" });
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
        aria-busy={loading}
        className="space-y-4 rounded-lg border border-zinc-900 bg-zinc-950 p-5"
      >
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600" aria-label="Progresso do checkout"><span className="text-red-400">1. Dados</span><span aria-hidden="true">→</span><span>2. Pagamento</span></div>
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

        <LoadingButton
          type="submit"
          disabled={loading || items.length === 0}
          loading={loading}
          loadingText="A preparar..."
          size="lg"
          className="w-full"
        >
          Pagar encomenda
        </LoadingButton>

        {message && (
          <p className="subtle-enter rounded-lg border border-red-900 bg-red-950/40 p-4 font-bold text-red-100" role="alert">
            {message}
          </p>
        )}
      </form>

      <aside className="h-fit rounded-lg border border-zinc-900 bg-zinc-950 p-5">
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
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalCents)}</span>
          </p>
          <p className="flex justify-between text-zinc-400">
            <span>Envio CTT</span>
            <span>{formatMoney(totals.shippingCents)}</span>
          </p>
          <p className="flex justify-between pt-2 text-lg font-black">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents)}</span>
          </p>
          <p className="text-xs font-bold text-zinc-500">
            IVA incluído nos preços apresentados.
          </p>
        </div>
      </aside>
    </section>
  );
}
