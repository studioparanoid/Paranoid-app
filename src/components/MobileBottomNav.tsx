"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { isNavigationActive, mobileNavigation } from "@/config/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => setKeyboardOpen(window.innerHeight - viewport.height > 140);
    const timer = window.setTimeout(updateKeyboardState, 0);
    viewport.addEventListener("resize", updateKeyboardState);
    return () => {
      window.clearTimeout(timer);
      viewport.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  const [agenda, map, tickets, shop] = mobileNavigation;
  const items = [agenda, map, tickets, shop];

  function focusHub(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    event.preventDefault();
    window.history.replaceState(null, "", "/?focus=hub");
    window.dispatchEvent(new Event("paranoid:focus-hub"));
  }

  if (keyboardOpen) return null;

  return <nav aria-label="Navegação principal" className="bottom-nav-shadow fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--bottom-nav-background)] px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5 items-center gap-1">
      {items.slice(0, 2).map((item) => {
        const active = isNavigationActive(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 py-1.5 text-center text-[10px] font-bold ${active ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
          <span className={`interactive grid h-7 min-w-9 place-items-center rounded-full ${active ? "bg-danger/45 text-danger" : ""}`}><AppIcon name={item.icon} className="h-5 w-5" /></span>
          <span>{item.label}</span>
        </Link>;
      })}
      <Link
        href="/?focus=hub"
        onClick={focusHub}
        aria-label="Centro Paranoid"
        aria-current={pathname === "/" ? "page" : undefined}
        className="pressable focus-ring flex min-h-12 items-center justify-center rounded px-1 py-1.5"
      >
        <span className={`grid h-9 w-9 place-items-center rounded-full border bg-[#080808] text-base font-black leading-none text-white shadow-[0_4px_12px_rgb(0_0_0_/_0.3)] ${pathname === "/" ? "border-danger" : "border-border-strong"}`}>P</span>
      </Link>
      {items.slice(2).map((item) => {
        const active = isNavigationActive(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 py-1.5 text-center text-[10px] font-bold ${active ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
          <span className={`interactive grid h-7 min-w-9 place-items-center rounded-full ${active ? "bg-danger/45 text-danger" : ""}`}><AppIcon name={item.icon} className="h-5 w-5" /></span>
          <span>{item.label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
