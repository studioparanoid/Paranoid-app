import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { formatMoney, type ShopProduct } from "@/lib/shop";

export function ProductCard({ product }: { product: ShopProduct }) {
  const soldOut = product.stockQuantity <= 0;

  return (
    <article className="group card-hover relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-border-strong focus-within:border-accent/60">
      <div className="relative aspect-square overflow-hidden bg-surface-secondary">
        <Image
          src={product.images[0] || "/images/home-shop.webp"}
          alt={product.images[0] ? product.name : "Merch independente Paranoid"}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
          unoptimized={Boolean(product.images[0])}
          className={`interactive object-cover duration-[var(--motion-slow)] group-hover:scale-[1.02] ${soldOut ? "grayscale" : ""}`}
        />
        {soldOut ? <span className="absolute left-3 top-3 rounded-full bg-black/85 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wide text-white">Esgotado</span> : null}
      </div>
      <div className="relative min-h-32 p-3.5">
        <Link href={`/loja/${product.slug}`} className="focus-ring absolute inset-0 z-10 rounded-2xl" aria-label={`Abrir ${product.name}`} />
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-accent">{product.category}</p>
        <h2 className="mt-1.5 line-clamp-2 pr-6 text-lg font-bold leading-5 tracking-tight">{product.name}</h2>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="truncate text-xs font-semibold text-foreground-muted">{product.sellerName}</p>
          <p className="shrink-0 text-base font-bold text-foreground">{formatMoney(product.finalPriceCents)}</p>
        </div>
        <AppIcon name="chevron" className="absolute right-3.5 top-4 h-4 w-4 translate-x-1 text-foreground-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </article>
  );
}
