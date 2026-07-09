"use client";

import { useState } from "react";
import {
  DEFAULT_COMMISSION_RATE,
  fallbackShopProducts,
  formatMoney,
} from "@/lib/shop";

export function AdminShopClient() {
  const [commission, setCommission] = useState(
    String(Math.round(DEFAULT_COMMISSION_RATE * 100))
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-4">
        {fallbackShopProducts.map((product) => (
          <article
            key={product.id}
            className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
                  {product.status}
                </p>
                <h2 className="mt-2 text-2xl font-black">{product.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{product.sellerName}</p>
              </div>
              <p className="rounded-full bg-[#f2f1ec] px-3 py-1 text-sm font-black text-black">
                {formatMoney(product.finalPriceCents)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-full border border-green-900 px-4 py-3 text-sm font-black text-green-300"
              >
                Aprovar
              </button>
              <button
                type="button"
                className="rounded-full border border-red-900 px-4 py-3 text-sm font-black text-red-300"
              >
                Rejeitar
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Comissão</h2>
          <label className="mt-5 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Percentagem
            </span>
            <input
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
            />
          </label>
          <p className="mt-4 text-sm text-zinc-500">
            Este valor passa para `shop_settings` quando a migration estiver
            ativa.
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Estados</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-400">
            <p>Paga / a aguardar envio</p>
            <p>Enviada com tracking CTT</p>
            <p>Entregue / concluída</p>
            <p>Payout manual ao artista</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

