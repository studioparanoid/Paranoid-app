"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { isNavigationActive, mainNavigation } from "@/config/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();

  return <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-900 bg-[#0b0b0b]/96 px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
      {mainNavigation.map((item) => {
        const active = isNavigationActive(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 py-1.5 text-center text-[10px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${active ? "text-[#f2f1ec]" : "text-zinc-600 hover:text-zinc-300"}`}>
          <AppIcon name={item.icon} className={`h-5 w-5 ${active ? "text-red-500" : ""}`} />
          <span>{item.label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
