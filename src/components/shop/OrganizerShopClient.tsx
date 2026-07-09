"use client";

import { useState } from "react";
import { calculateShopPrice, formatMoney } from "@/lib/shop";

export function OrganizerShopClient() {
  const [basePrice, setBasePrice] = useState("20");
  const price = calculateShopPrice(Math.round(Number(basePrice || "0") * 100));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
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

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Descrição curta
            </span>
            <textarea
              rows={4}
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
              <span>Comissão Paranoid</span>
              <span>{formatMoney(price.commissionCents)}</span>
            </p>
            <p className="flex justify-between border-t border-zinc-900 pt-3 text-lg font-black">
              <span>Cliente vê</span>
              <span>{formatMoney(price.finalPriceCents)}</span>
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Envios</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Depois do pagamento, a encomenda fica em “A aguardar envio”.
            Embala o produto, cola a etiqueta CTT quando existir e adiciona o
            tracking.
          </p>
        </section>
      </aside>
    </div>
  );
}

