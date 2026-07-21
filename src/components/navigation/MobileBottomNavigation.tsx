"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePendingBookingRequestCount } from "@/hooks/usePendingBookingRequestCount";
import {
  ParanoidAgendaIcon,
  ParanoidHomeIcon,
  ParanoidMapIcon,
  ParanoidProfileIcon,
  ParanoidTicketIcon,
  type ParanoidIconProps,
} from "@/components/navigation/ParanoidIconSystem";
import { supabase } from "@/lib/supabase/public";

type NavigationItem = {
  href: string;
  icon: ComponentType<ParanoidIconProps>;
  label: string;
  matches: (pathname: string) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    icon: ParanoidHomeIcon,
    label: "Home",
    matches: (pathname) => pathname === "/" || pathname === "/para-ti",
  },
  {
    href: "/mapa",
    icon: ParanoidMapIcon,
    label: "Mapa",
    matches: (pathname) => pathname === "/mapa",
  },
  {
    href: "/agenda",
    icon: ParanoidAgendaIcon,
    label: "Agenda",
    matches: (pathname) => pathname.startsWith("/agenda"),
  },
  {
    href: "/bilhetes",
    icon: ParanoidTicketIcon,
    label: "Bilhetes",
    matches: (pathname) => pathname.startsWith("/bilhetes"),
  },
  {
    href: "/perfil",
    icon: ParanoidProfileIcon,
    label: "Perfil",
    matches: (pathname) => pathname.startsWith("/perfil"),
  },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const pendingRequestCount = usePendingBookingRequestCount();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [avatar, setAvatar] = useState<{ userId: string; url: string | null } | null>(null);

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

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setAvatar({ userId: user.id, url: data?.avatar_url || null });
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (keyboardOpen) return null;

  const avatarUrl = user && avatar?.userId === user.id ? avatar.url : null;
  const [home, map, agenda, tickets, profile] = navigationItems;

  return (
    <nav
      aria-label="Navegação principal"
      className="paranoid-mobile-nav fixed inset-x-0 bottom-0 z-[70] border-t border-[var(--border)] bg-[color:var(--bottom-nav-background)]/95 px-2 pb-[calc(0.3rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid h-[3.55rem] max-w-lg grid-cols-5 items-center">
        <NavigationLink item={home} active={home.matches(pathname)} />
        <NavigationLink item={map} active={map.matches(pathname)} />
        <NavigationLink item={agenda} active={agenda.matches(pathname)} />
        <NavigationLink item={tickets} active={tickets.matches(pathname)} />
        <NavigationLink item={profile} active={profile.matches(pathname)} avatarUrl={avatarUrl} badge={pendingRequestCount} resetOnReclick />
      </div>
    </nav>
  );
}

function NavigationLink({
  active,
  avatarUrl,
  badge,
  item,
  resetOnReclick,
}: {
  active: boolean;
  avatarUrl?: string | null;
  badge?: number;
  item: NavigationItem;
  resetOnReclick?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      onClick={(event) => {
        if (resetOnReclick && active) {
          event.preventDefault();
          window.location.href = item.href;
        }
      }}
      className={`group focus-ring pressable relative mx-auto grid h-12 w-full min-w-11 place-items-center transition-colors duration-150 ${
        active ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]"
      }`}
    >
      <span className="relative grid h-8 w-8 place-items-center transition-transform duration-150 group-active:translate-y-px group-active:scale-[0.96]">
        {item.label === "Perfil" && avatarUrl ? (
          <span className={`relative h-[1.65rem] w-[1.65rem] overflow-hidden rounded-full border ${active ? "border-current" : "border-[var(--border-strong)]"}`}>
            <Image src={avatarUrl} alt="" fill sizes="27px" className="object-cover" unoptimized />
          </span>
        ) : (
          <Icon className="h-[1.65rem] w-[1.65rem]" active={active} />
        )}
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -right-1 -top-0.5 min-w-4 rounded-sm border border-[var(--background)] bg-[var(--accent)] px-0.5 text-center text-[9px] font-black leading-[0.9rem] text-white" aria-label={`${badge} notificações`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <ActiveSignal active={active} />
    </Link>
  );
}

function ActiveSignal({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-0 h-[2px] bg-current transition-[width,opacity] duration-150 ${active ? "w-3 opacity-100" : "w-0 opacity-0"}`}
    />
  );
}
