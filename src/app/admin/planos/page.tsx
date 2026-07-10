import { AdminCreateBillingPaymentForm } from "@/components/billing/AdminCreateBillingPaymentForm";
import { AdminBillingPaymentsClient } from "@/components/billing/AdminBillingPaymentsClient";

export default function AdminPlansPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Admin
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Planos.
        </h1>

        <div className="mb-5 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-400">
          Wall Rip e Paranoid Crew continuam em modo mock. Ao marcar o pagamento
          como pago, o pack fica ativo durante 1 mês.
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCreateBillingPaymentForm
            productCode="organizer_pack_wall_rip"
            relatedType="organizer"
            idLabel="ID do organizador"
          />
          <AdminCreateBillingPaymentForm
            productCode="organizer_pack_paranoid_crew"
            relatedType="organizer"
            idLabel="ID do organizador"
          />
        </div>

        <AdminBillingPaymentsClient
          relatedType="organizer"
          title="Pagamentos de planos"
        />
      </section>
    </main>
  );
}
