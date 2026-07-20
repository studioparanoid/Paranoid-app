"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { SearchButton } from "@/components/SearchButton";
import { ParanoidBackIcon, ParanoidMark } from "@/components/navigation/ParanoidIconSystem";
import { isNavigationActive, mobileNavigation } from "@/config/navigation";
import { isMobileSimplificationEnabled } from "@/lib/mobile-simplification/flag";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [agenda, map, tickets, shop] = mobileNavigation;
  const items = [agenda, map, tickets, shop];
  const mobileSimplificationEnabled = isMobileSimplificationEnabled();
  const hideMobileHeader = mobileSimplificationEnabled && pathname === "/";

  function focusHub(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    event.preventDefault();
    window.history.replaceState(null, "", "/?focus=hub");
    window.dispatchEvent(new Event("paranoid:focus-hub"));
  }

  function goBack() {
    const cameFromThisApp = document.referrer.startsWith(window.location.origin);
    if (cameFromThisApp && window.history.length > 1) router.back();
    else router.push("/");
  }

  const showBackBar = mobileSimplificationEnabled && !isPrimaryMobileRoute(pathname);

  return <header className={`brand-surface app-header-shadow sticky top-0 z-50 border-b border-[var(--brand-border)] bg-black backdrop-blur-lg ${hideMobileHeader ? "hidden lg:block" : "block"}`}>
    {showBackBar && (
      <div className="mx-auto flex h-12 items-center px-3 lg:hidden">
        <button type="button" onClick={goBack} aria-label="Voltar" className="focus-ring pressable grid h-11 w-11 place-items-center text-zinc-300 hover:text-white">
          <ParanoidBackIcon className="h-5 w-5" />
        </button>
      </div>
    )}
    <div className={`mx-auto h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-10 ${mobileSimplificationEnabled ? "hidden lg:flex" : "flex"}`}>
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
        <Link href="/?focus=hub" onClick={focusHub} aria-label="Centro Paranoid" aria-current={pathname === "/" ? "page" : undefined} className="focus-ring mx-2 grid h-10 w-10 place-items-center text-white hover:text-zinc-200">
          <ParanoidMark className="h-7 w-7" active={pathname === "/"} />
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

function isPrimaryMobileRoute(pathname: string) {
  return pathname === "/mapa" || pathname === "/bilhetes" || pathname === "/perfil";
}
