"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { SearchButton } from "@/components/SearchButton";
import { isNavigationActive, mobileNavigation } from "@/config/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const [agenda, map, tickets, shop] = mobileNavigation;
  const items = [agenda, map, tickets, shop];

  function focusHub(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    event.preventDefault();
    window.history.replaceState(null, "", "/?focus=hub");
    window.dispatchEvent(new Event("paranoid:focus-hub"));
  }

  return <header className="brand-surface app-header-shadow sticky top-0 z-50 border-b border-[var(--brand-border)] bg-black backdrop-blur-lg">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-10">
      <Link href="/" className="pressable focus-ring flex min-w-0 items-center rounded" aria-label="Paranoid Studio - Centro">
        <Image
          src="/brand/paranoid-studio-logo-header-transparent.png"
          width={830}
          height={323}
          alt="Paranoid Studio"
          priority
          sizes="(max-width: 639px) 78px, 96px"
          className="h-[30px] max-h-[30px] w-auto shrink-0 object-contain sm:h-9 sm:max-h-9"
        />
      </Link>

      <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
        {items.slice(0, 2).map((item) => {
          const active = isNavigationActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative rounded px-4 py-2 text-sm font-bold ${active ? "bg-[#f7f5ef] text-black after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-red-600" : "text-zinc-300 hover:bg-[var(--brand-surface-hover)] hover:text-white"}`}><span className="relative z-10">{item.label}</span></Link>;
        })}
        <Link href="/?focus=hub" onClick={focusHub} aria-label="Centro Paranoid" aria-current={pathname === "/" ? "page" : undefined} className="focus-ring mx-2 grid h-9 w-9 place-items-center rounded-full border border-zinc-700 bg-[#080808] text-sm font-black leading-none text-white hover:border-zinc-400">
          P
        </Link>
        {items.slice(2).map((item) => {
          const active = isNavigationActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`interactive pressable focus-ring relative rounded px-4 py-2 text-sm font-bold ${active ? "bg-[#f7f5ef] text-black after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-red-600" : "text-zinc-300 hover:bg-[var(--brand-surface-hover)] hover:text-white"}`}><span className="relative z-10">{item.label}</span></Link>;
        })}
      </nav>

      <div className="flex items-center gap-1"><SearchButton /><ProfileMenu /></div>
    </div>
  </header>;
}
