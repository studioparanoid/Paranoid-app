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
import { Button, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type SellerProduct = {
  id: string;
  name: string;
  status: string | null;
  stock_quantity: number | null;
  final_price_cents: number | null;
  partner_payout_type: string | null;
  partner_payout_cents: number | null;
  partner_payout_rate: number | null;
  production_cost_cents: number | null;
  category: string | null;
};

type SellerProfile = {
  id: string;
  legal_name: string | null;
  tax_number: string | null;
  fiscal_email: string | null;
  iban: string | null;
  seller_type: string | null;
  legal_entity_type: string | null;
  can_issue_invoice: boolean | null;
  fiscal_status: string | null;
  contract_status: string | null;
};

export function OrganizerShopClient() {
  const [basePrice, setBasePrice] = useState("20");
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(
    null
  );
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, string>>(
    {}
  );
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const { toast } = useToast();
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
      .select(
        "id,legal_name,tax_number,fiscal_email,iban,seller_type,legal_entity_type,can_issue_invoice,fiscal_status,contract_status"
      )
      .eq("user_id", user.id);
    const sellerIds = (sellers || []).map((seller) => seller.id);
    setSellerProfile(((sellers || [])[0] as SellerProfile) || null);

    if (sellerIds.length === 0) {
      setProducts([]);
      return;
    }

    const { data } = await supabase
      .from("shop_products")
      .select(
        "id,name,status,stock_quantity,final_price_cents,partner_payout_type,partner_payout_cents,partner_payout_rate,production_cost_cents,category"
      )
      .in("seller_id", sellerIds)
      .order("created_at", { ascending: false });

    setProducts((data || []) as SellerProduct[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
      void loadProducts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveFiscalProfile() {
    if (!sellerProfile || busyAction) {
      return;
    }
    setBusyAction("fiscal");

    const { error } = await supabase
      .from("shop_sellers")
      .update({
        legal_name: sellerProfile.legal_name,
        tax_number: sellerProfile.tax_number,
        fiscal_email: sellerProfile.fiscal_email,
        iban: sellerProfile.iban,
        seller_type: sellerProfile.seller_type,
        legal_entity_type: sellerProfile.legal_entity_type,
        can_issue_invoice: sellerProfile.can_issue_invoice,
        fiscal_status: "pending",
      })
      .eq("id", sellerProfile.id);

    setMessage(
      error
        ? "Não consegui guardar os dados fiscais."
        : "Dados fiscais guardados para validação."
    );
    await loadProducts();
    setBusyAction("");
    toast(error ? { message: "Não foi possível guardar os dados fiscais.", tone: "error" } : { message: "Dados fiscais guardados.", tone: "success" });
  }

  const payoutTotal = useMemo(() => {
    return orders.reduce(
      (total, order) =>
        total +
        order.items.reduce((itemTotal, item) => itemTotal + item.payoutAmountCents, 0),
      0
    );
  }, [orders]);

  async function markShipped(orderId: string) {
    if (busyAction) return;
    setBusyAction(`ship-${orderId}`);
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão.");
      setBusyAction("");
      toast({ message: "Tens de iniciar sessão.", tone: "error" });
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
      setBusyAction("");
      toast({ message: "Não foi possível marcar como enviado.", tone: "error" });
      return;
    }

    await loadOrders();
    setMessage("Encomenda marcada como enviada.");
    setBusyAction("");
    toast({ message: "Encomenda marcada como enviada.", tone: "success" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="space-y-4">
        <div className="rounded-[1.5rem] border border-danger bg-danger/20 p-5">
          <p className="text-sm font-bold leading-relaxed text-danger">
            Para receber pagamentos da Paranoid, tens de emitir fatura,
            fatura-recibo, ato isolado ou documento fiscal válido à Paranoid.
          </p>
          <p className="mt-3 text-xs font-bold text-foreground-muted">
            A Paranoid só processa pagamentos após receber documento fiscal
            válido. O parceiro é fornecedor/licenciador/parceiro comercial, não
            funcionário da Paranoid.
          </p>
        </div>

        {sellerProfile && (
          <div className="rounded-[1.5rem] border border-border bg-background p-5">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-danger">
              Fiscal
            </p>
            <h2 className="mt-3 text-3xl font-black">Dados para pagamento</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["legal_name", "Nome legal"],
                ["tax_number", "NIF"],
                ["fiscal_email", "Email fiscal"],
                ["iban", "IBAN"],
              ].map(([key, label]) => (
                <label key={key} className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground-muted">
                    {label}
                  </span>
                  <input
                    value={String(
                      sellerProfile[key as keyof SellerProfile] || ""
                    )}
                    onChange={(event) =>
                      setSellerProfile((current) =>
                        current
                          ? { ...current, [key]: event.target.value }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
                  />
                </label>
              ))}

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground-muted">
                  Tipo de entidade
                </span>
                <select
                  value={sellerProfile.seller_type || "artist"}
                  onChange={(event) =>
                    setSellerProfile((current) =>
                      current
                        ? { ...current, seller_type: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
                >
                  <option value="artist">Artista individual</option>
                  <option value="band">Banda/coletivo</option>
                  <option value="organizer">Organizador</option>
                  <option value="label">Editora</option>
                  <option value="association">Associação</option>
                  <option value="company">Empresa</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground-muted">
                  Documento fiscal
                </span>
                <select
                  value={sellerProfile.can_issue_invoice ? "yes" : "no"}
                  onChange={(event) =>
                    setSellerProfile((current) =>
                      current
                        ? {
                            ...current,
                            can_issue_invoice: event.target.value === "yes",
                          }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
                >
                  <option value="yes">Consigo emitir</option>
                  <option value="no">Ainda não consigo</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full border border-border px-3 py-2 text-foreground-muted">
                Fiscal: {sellerProfile.fiscal_status || "pending"}
              </span>
              <span className="rounded-full border border-border px-3 py-2 text-foreground-muted">
                Contrato: {sellerProfile.contract_status || "pending"}
              </span>
            </div>

            <LoadingButton
              onClick={saveFiscalProfile}
              loading={busyAction === "fiscal"}
              loadingText="A guardar..."
              disabled={Boolean(busyAction)}
              className="mt-5"
            >
              Guardar dados fiscais
            </LoadingButton>
          </div>
        )}

        <div className="rounded-[1.5rem] border border-border bg-background p-5">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-danger">
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
                <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground-muted">
                  {label}
                </span>
                <input
                  placeholder={placeholder}
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
                />
              </label>
            ))}

            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground-muted">
                Preço base que queres receber
              </span>
              <input
                value={basePrice}
                onChange={(event) => setBasePrice(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
              />
            </label>

            <Button
              onClick={() => toast("A submissão de produtos ainda está em preparação.")}
            >
              Guardar como pendente
            </Button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black">Produtos</h2>

          {products.length === 0 && (
            <p className="rounded-[1.5rem] border border-border bg-background p-5 text-foreground-muted">
              Ainda não tens produtos ligados à tua loja.
            </p>
          )}

          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-[1.5rem] border border-border bg-background p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">
                    {product.category || "Merch"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{product.name}</h3>
                <p className="mt-1 text-sm text-foreground-muted">
                  {product.status || "sem estado"} · stock{" "}
                  {product.stock_quantity ?? 0}
                </p>
                <p className="mt-1 text-xs font-bold text-foreground-muted">
                  payout {product.partner_payout_type || "none"} · produção{" "}
                  {formatMoney(product.production_cost_cents || 0)}
                </p>
                </div>
                <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
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
            <p className="rounded-[1.5rem] border border-border bg-background p-5 text-foreground-muted">
              Ainda não há encomendas.
            </p>
          )}

          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[1.5rem] border border-border bg-background p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">
                    #{normalizeOrderId(order.id)}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {getOrderStatusLabel(order.orderStatus)}
                  </h3>
                </div>
                <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
                  {formatMoney(
                    order.items.reduce(
                      (total, item) => total + item.payoutAmountCents,
                      0
                    )
                  )}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-foreground-muted">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.quantity}x {item.productName} ·{" "}
                    {formatMoney(item.payoutAmountCents)}
                  </p>
                ))}
              </div>

              <div className="mt-5 grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-foreground-muted">
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
                  className="rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
                />
                <LoadingButton
                  onClick={() => markShipped(order.id)}
                  loading={busyAction === `ship-${order.id}`}
                  loadingText="A enviar..."
                  disabled={Boolean(busyAction)}
                  variant="secondary"
                >
                  Marcar como enviado
                </LoadingButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-border bg-background p-5">
          <h2 className="text-2xl font-black">Preço final</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex justify-between text-foreground-muted">
              <span>Valor parceiro</span>
              <span>{formatMoney(price.basePriceCents)}</span>
            </p>
            <p className="flex justify-between text-foreground-muted">
              <span>Taxa incluída</span>
              <span>{formatMoney(price.commissionCents)}</span>
            </p>
            <p className="flex justify-between border-t border-border pt-3 text-lg font-black">
              <span>Cliente vê</span>
              <span>{formatMoney(price.finalPriceCents)}</span>
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border bg-background p-5">
          <h2 className="text-2xl font-black">Previsto a receber</h2>
          <p className="mt-4 text-4xl font-black">{formatMoney(payoutTotal)}</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
            Pagamentos só são processados depois de documento fiscal válido
            aprovado pela Paranoid.
          </p>
        </section>
      </aside>
    </div>
  );
}
