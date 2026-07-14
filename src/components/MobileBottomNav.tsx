"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { isNavigationActive, mainNavigation } from "@/config/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();

  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--bottom-nav-background)] px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
      {mainNavigation.map((item) => {
        const active = isNavigationActive(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 py-1.5 text-center text-[10px] font-bold ${active ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]"}`}>
          <span className={`interactive grid h-7 min-w-9 place-items-center rounded-full ${active ? "bg-red-950/45 text-red-500" : ""}`}><AppIcon name={item.icon} className="h-5 w-5" /></span>
          <span>{item.label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
