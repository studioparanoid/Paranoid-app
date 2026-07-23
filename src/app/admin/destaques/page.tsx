import { AdminCreateBillingPaymentForm } from "@/components/billing/AdminCreateBillingPaymentForm";
import { AdminBillingPaymentsClient } from "@/components/billing/AdminBillingPaymentsClient";

export default function AdminHighlightsPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-danger">
          Admin
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Destaques.
        </h1>

        <div className="mb-5 rounded-[1.5rem] border border-border bg-background p-5 text-sm text-foreground-muted">
          Pagamentos de destaque ficam pendentes até serem confirmados. O
          destaque individual ativa 7 dias; o pack cria 3 créditos.
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCreateBillingPaymentForm
            productCode="event_feature_basic"
            relatedType="event"
            idLabel="ID do evento"
          />
          <AdminCreateBillingPaymentForm
            productCode="event_feature_pack_3"
            relatedType="organizer"
            idLabel="ID do organizador"
          />
        </div>

        <AdminBillingPaymentsClient
          productCodes={["event_feature_basic", "event_feature_pack_3"]}
          title="Pagamentos de destaque"
        />
      </section>
    </main>
  );
}
