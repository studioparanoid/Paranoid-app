import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export function HomeHero() {
  return (
    <section className="home-hero relative flex min-h-[23rem] items-end overflow-hidden border-b border-zinc-900 py-10 sm:min-h-[25rem] sm:py-14 lg:min-h-[28rem] lg:py-16">
      <div className="relative z-10 max-w-4xl">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.42em] text-red-500">
          Paranoid Studio
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.94] sm:text-7xl lg:text-8xl">
          A cultura está a acontecer.
        </h1>
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton href="/agenda">Explorar Agenda</LinkButton>
          <LinkButton href="/mapa" variant="secondary">Abrir Mapa</LinkButton>
        </div>
      </div>

      <Link
        href="/loja"
        className="pressable focus-ring absolute bottom-10 right-0 hidden rounded-full border border-zinc-800 px-4 py-2 text-xs font-black text-zinc-500 hover:border-zinc-600 hover:text-white lg:block"
      >
        Loja <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
