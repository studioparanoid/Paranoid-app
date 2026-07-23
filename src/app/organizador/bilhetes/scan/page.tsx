import Link from "next/link";
import { TicketScannerClient } from "@/components/TicketScannerClient";

export default function OrganizerTicketScannerPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <Link
          href="/organizador/bilhetes"
          className="mb-6 inline-block text-sm text-foreground-muted"
        >
          ← Voltar à bilheteira
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-danger">
              Scanner
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Ler código. Abrir porta.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-border bg-background p-5 lg:p-6">
            <p className="text-base leading-relaxed text-foreground-muted lg:text-lg">
              Aponta a câmara ao QR code do bilhete. Se a reserva estiver ativa,
              a entrada fica marcada automaticamente.
            </p>
          </div>
        </section>

        <TicketScannerClient />
      </section>
    </main>
  );
}