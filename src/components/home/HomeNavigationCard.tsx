import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";

type HomeNavigationCardProps = {
  href: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  eager?: boolean;
};

export function HomeNavigationCard({ href, image, imageAlt, eyebrow, title, description, eager = false }: HomeNavigationCardProps) {
  return (
    <article className="group interactive-card relative aspect-square min-w-0 overflow-hidden rounded-lg bg-zinc-950 sm:aspect-[4/3]">
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 767px) 100vw, 50vw"
        loading={eager ? "eager" : "lazy"}
        className="interactive object-cover duration-[var(--motion-slow)] group-hover:scale-[1.025]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/10" aria-hidden="true" />
      <Link href={href} className="focus-ring absolute inset-0 z-10 rounded-lg" aria-label={`${title}: ${description}`} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.32em] text-red-400">{eyebrow}</p>
          <h2 className="mt-2 text-4xl font-black leading-none sm:text-5xl">{title}</h2>
          <p className="mt-3 text-sm font-bold text-zinc-300 sm:text-base">{description}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 bg-black/55 text-white transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1" aria-hidden="true">
          <AppIcon name="chevron" />
        </span>
      </div>
    </article>
  );
}
