"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { adminNavigation } from "@/config/navigation";

const AdminDashboardClient = dynamic(() => import("@/components/AdminDashboardClient").then((module) => module.AdminDashboardClient), { ssr: false, loading: () => <LoadingSkeleton rows={5} /> });

export function AdminOverview() {
  const [operationsOpen, setOperationsOpen] = useState(false);
  return <>
    <PageHeader eyebrow="Admin" title="Administração" description="Conteúdo, utilizadores, comercial, loja e sistema." />
    <div className="mt-7 grid gap-8 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Administração" className="space-y-6">
        {adminNavigation.map((group) => <section key={group.label}><h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-700">{group.label}</h2><div className="divide-y divide-zinc-900 border-y border-zinc-900">{group.items.map((item) => <Link key={item.href} href={item.href} className="flex min-h-12 items-center gap-3 py-2 text-sm font-bold text-zinc-400 hover:text-white"><AppIcon name={item.icon} className="h-4 w-4 text-zinc-700" /><span className="min-w-0 flex-1">{item.label}</span><AppIcon name="chevron" className="h-4 w-4 text-zinc-800" /></Link>)}</div></section>)}
      </nav>
      <section>
        <div className="border-y border-zinc-900 py-7"><p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Conteúdo</p><h2 className="mt-2 text-3xl font-black">Atividade e aprovações</h2><p className="mt-2 max-w-xl text-sm text-zinc-500">Submissões pendentes, perfis e eventos publicados.</p><button type="button" onClick={() => setOperationsOpen((value) => !value)} className="mt-5 rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">{operationsOpen ? "Fechar atividade" : "Abrir atividade"}</button></div>
        {operationsOpen && <AdminDashboardClient />}
      </section>
    </div>
  </>;
}
