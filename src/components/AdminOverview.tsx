"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { adminNavigation } from "@/config/navigation";

const AdminDashboardClient = dynamic(() => import("@/components/AdminDashboardClient").then((module) => module.AdminDashboardClient), { ssr: false, loading: () => <LoadingSkeleton rows={5} /> });

export function AdminOverview() {
  return <>
    <PageHeader eyebrow="Admin" title="Administração" description="Conteúdo, utilizadores, comercial, loja e sistema." />
    <AdminDashboardClient />
    <nav aria-label="Administração" className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
      {adminNavigation.map((group) => <section key={group.label} className="shadow-card rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-danger">{group.label}</h2><div className="divide-y divide-[var(--border)]">{group.items.map((item) => <Link key={item.href} href={item.href} className="interactive focus-ring flex min-h-12 items-center gap-3 rounded px-1 py-2 text-sm font-bold text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"><AppIcon name={item.icon} className="h-4 w-4 text-danger" /><span className="min-w-0 flex-1">{item.label}</span><AppIcon name="chevron" className="h-4 w-4 text-[var(--foreground-muted)]" /></Link>)}</div></section>)}
    </nav>
  </>;
}
