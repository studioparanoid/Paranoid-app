import Link from "next/link";
import { AdminProfileApprovalsClient } from "@/components/AdminProfileApprovalsClient";

export default function AdminProfileApprovalsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link href="/admin" className="mb-6 inline-block text-sm text-foreground-muted">
          ← Voltar ao admin
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-danger">
              Admin · Perfis
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Quem entra na rede.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-border bg-background p-5 lg:p-6">
            <p className="text-base leading-relaxed text-foreground-muted lg:text-lg">
              Aprova artistas, organizadores e espaços. A comunidade entra
              automaticamente.
            </p>
          </div>
        </section>

        <AdminProfileApprovalsClient />
      </section>
    </main>
  );
}