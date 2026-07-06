"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/para-ti",
    label: "Para ti",
  },
  {
    href: "/agenda",
    label: "Agenda",
  },
  {
    href: "/descobrir",
    label: "Rede",
  },
  {
    href: "/guardados",
    label: "Guard.",
  },
  {
    href: "/bilhetes",
    label: "Bilhetes",
  },
  {
    href: "/perfil",
    label: "Perfil",
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-[#0b0b0b]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-1 py-3 text-center text-[10px] font-black transition ${
                active
                  ? "bg-[#f2f1ec] text-black"
                  : "text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}