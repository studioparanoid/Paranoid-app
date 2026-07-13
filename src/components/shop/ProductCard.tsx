import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { formatMoney, type ShopProduct } from "@/lib/shop";

export function ProductCard({ product }: { product: ShopProduct }) {
  const soldOut = product.stockQuantity <= 0;

  return (
    <article className="group card-hover relative overflow-hidden rounded-lg border border-zinc-900 bg-[#0d0d0d] hover:border-zinc-700 focus-within:border-red-900">
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        <Image
          src={product.images[0] || "/images/home-shop.webp"}
          alt={product.images[0] ? product.name : "Merch independente Paranoid"}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
          unoptimized={Boolean(product.images[0])}
          className={`interactive object-cover duration-[var(--motion-slow)] group-hover:scale-[1.02] ${soldOut ? "grayscale" : ""}`}
        />
        {soldOut ? <span className="absolute left-3 top-3 rounded bg-black/85 px-3 py-2 text-[0.65rem] font-black uppercase tracking-wide text-zinc-300">Esgotado</span> : null}
      </div>
      <div className="relative min-h-36 p-4">
        <Link href={`/loja/${product.slug}`} className="focus-ring absolute inset-0 z-10 rounded-lg" aria-label={`Abrir ${product.name}`} />
        <p className="text-[0.6rem] font-black uppercase tracking-[0.28em] text-red-500">{product.category}</p>
        <h2 className="mt-2 line-clamp-2 pr-8 text-xl font-black leading-[1.08]">{product.name}</h2>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="truncate text-xs font-bold text-zinc-600">{product.sellerName}</p>
          <p className="shrink-0 text-base font-black text-[#f2f1ec]">{formatMoney(product.finalPriceCents)}</p>
        </div>
        <AppIcon name="chevron" className="absolute right-4 top-5 h-4 w-4 translate-x-1 text-zinc-700 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </article>
  );
}
