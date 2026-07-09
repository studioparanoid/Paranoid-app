"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { href: "/agenda", label: "Agenda" },
  { href: "/descobrir", label: "Descobrir" },
  { href: "/loja", label: "Loja" },
  { href: "/para-ti", label: "Para ti" },
  { href: "/guardados", label: "Guardados" },
  { href: "/bilhetes", label: "Bilhetes" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 hidden border-b border-zinc-900 bg-[#0b0b0b]/90 px-10 py-4 backdrop-blur-xl lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-950 bg-red-950/40 text-sm font-black text-red-500 transition group-hover:border-red-800">
            P
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#f2f1ec]">
              Paranoid
            </p>

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-600">
              Agenda cultural
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {mainLinks.map((link) => {
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  active
                    ? "bg-[#f2f1ec] text-black"
                    : "text-zinc-400 hover:bg-zinc-950 hover:text-[#f2f1ec]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/submeter"
            className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-[#f2f1ec] hover:text-[#f2f1ec]"
          >
            Submeter
          </Link>

          <Link
            href="/perfil"
            className={`rounded-full px-5 py-3 text-sm font-black transition ${
              isActive(pathname, "/perfil")
                ? "bg-red-950 text-red-300"
                : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            Perfil
          </Link>
        </div>
      </div>
    </header>
  );
}
