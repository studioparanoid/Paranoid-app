"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Hoje" },
  { href: "/agenda", label: "Agenda" },
  { href: "/mapa", label: "Mapa" },
  { href: "/guardados", label: "Guardados" },
  { href: "/perfil", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs font-bold uppercase tracking-wide ${
                active ? "text-[#f2f1ec]" : "text-zinc-500"
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