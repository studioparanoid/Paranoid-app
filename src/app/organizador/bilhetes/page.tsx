import Link from "next/link";
import { OrganizerTicketsClient } from "@/components/OrganizerTicketsClient";

export default function OrganizerTicketsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-danger">
              Bilheteira
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Porta aberta ou fechada.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-border bg-background p-5 lg:p-6">
            <p className="text-base leading-relaxed text-foreground-muted lg:text-lg">
              Vê reservas da bilheteira Paranoid, procura por código/email e
              marca entradas à porta.
            </p>

            <Link
              href="/organizador/bilhetes/scan"
              className="mt-5 block rounded-full bg-[#f5f5f2] px-5 py-4 text-center text-sm font-black text-black"
            >
              Abrir scanner QR
            </Link>
          </div>
        </section>

        <OrganizerTicketsClient />
      </section>
    </main>
  );
}