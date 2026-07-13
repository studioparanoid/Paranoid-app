import { AdminCreateBillingPaymentForm } from "@/components/billing/AdminCreateBillingPaymentForm";
import { AdminBillingPaymentsClient } from "@/components/billing/AdminBillingPaymentsClient";
import { AdminSponsorshipsClient } from "@/components/billing/AdminSponsorshipsClient";

export default function AdminPartnersPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Admin
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Parceiros.
        </h1>

        <div className="mb-5 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-400">
          Cria pagamentos mock para Signal, Noise e Headliner. A campanha só
          fica ativa quando o pagamento for marcado como pago.
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <AdminCreateBillingPaymentForm
            productCode="paranoid_signal"
            relatedType="sponsorship"
            idLabel="ID opcional"
            allowEmptyRelatedId
          />
          <AdminCreateBillingPaymentForm
            productCode="paranoid_noise"
            relatedType="sponsorship"
            idLabel="ID opcional"
            allowEmptyRelatedId
          />
          <AdminCreateBillingPaymentForm
            productCode="paranoid_headliner"
            relatedType="sponsorship"
            idLabel="ID opcional"
            allowEmptyRelatedId
          />
        </div>

        <AdminBillingPaymentsClient
          relatedType="sponsorship"
          title="Pagamentos de parceiros"
        />

        <AdminSponsorshipsClient />
      </section>
    </main>
  );
}
