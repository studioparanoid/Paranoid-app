import { AdminCreateBillingPaymentForm } from "@/components/billing/AdminCreateBillingPaymentForm";
import { AdminBillingPaymentsClient } from "@/components/billing/AdminBillingPaymentsClient";

export default function AdminHighlightsPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Admin
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Destaques.
        </h1>

        <div className="mb-5 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-400">
          Pagamentos de destaque ficam pendentes até serem confirmados. Quando
          marcados como pagos, o evento recebe destaque durante 7 dias.
        </div>

        <AdminCreateBillingPaymentForm
          productCode="event_feature_basic"
          relatedType="event"
          idLabel="ID do evento"
        />

        <AdminBillingPaymentsClient relatedType="event" title="Pagamentos de destaque" />
      </section>
    </main>
  );
}
