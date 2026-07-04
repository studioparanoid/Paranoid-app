"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Para ti",
    href: "/para-ti",
  },
  {
    label: "Agenda",
    href: "/agenda",
  },
  {
    label: "Descobrir",
    href: "/descobrir",
  },
  {
    label: "Guardados",
    href: "/guardados",
  },
  {
    label: "Perfil",
    href: "/perfil",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-black/95 px-3 py-3 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-2 py-3 text-center text-[11px] font-black uppercase tracking-tight transition ${
                active
                  ? "bg-[#f2f1ec] text-black"
                  : "text-zinc-500 hover:text-[#f2f1ec]"
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