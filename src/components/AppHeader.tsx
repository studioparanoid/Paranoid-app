"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { SearchButton } from "@/components/SearchButton";
import { isNavigationActive, mainNavigation } from "@/config/navigation";

export function AppHeader() {
  const pathname = usePathname();

  return <header className="brand-surface sticky top-0 z-50 border-b border-[var(--brand-border)] bg-[var(--header-background)] backdrop-blur-lg">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-10">
      <Link href="/agenda" className="pressable focus-ring flex min-w-0 items-center gap-3 rounded" aria-label="Paranoid - Agenda">
        <span className="interactive grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-900/60 bg-red-950/45 text-xs font-black text-red-500 group-active:scale-95">P</span>
        <span className="hidden sm:block"><span className="block text-xs font-black uppercase tracking-[0.3em] text-[var(--brand-foreground)]">Paranoid</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-muted)]">Agenda cultural</span></span>
      </Link>

      <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
        {mainNavigation.map((item) => {
          const active = isNavigationActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative rounded px-4 py-2 text-sm font-bold ${active ? "bg-[#f7f5ef] text-black after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-red-600" : "text-zinc-300 hover:bg-[var(--brand-surface-hover)] hover:text-white"}`}><span className="relative z-10">{item.label}</span></Link>;
        })}
      </nav>

      <div className="flex items-center gap-1"><SearchButton /><ProfileMenu /></div>
    </div>
  </header>;
}
