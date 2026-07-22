"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";

export function AlbumStackedPreview({
  photos,
  title,
  href,
  visibility,
}: {
  photos: string[];
  title: string;
  href: string;
  visibility: "public" | "private";
}) {
  const previewPhotos = photos.slice(0, 4);
  const gridClass = previewPhotos.length <= 1
    ? "grid-cols-1"
    : previewPhotos.length === 2
      ? "grid-cols-2"
      : "grid-cols-2 grid-rows-2";

  return (
    <Link href={href} className="pressable focus-ring group block min-w-0" aria-label={`Abrir álbum ${title}`}>
      <div className={`relative grid aspect-square w-full gap-px overflow-hidden border border-border bg-surface-secondary ${gridClass}`}>
        {previewPhotos.length === 0 && (
          <div className="grid h-full place-items-center text-foreground-muted">
            <AppIcon name="gallery" className="h-7 w-7" />
          </div>
        )}
        {previewPhotos.map((photo, index) => (
          <div key={`${photo}-${index}`} className={`min-h-0 overflow-hidden ${previewPhotos.length === 3 && index === 0 ? "row-span-2" : ""}`}>
            <img src={photo} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          </div>
        ))}
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center bg-black/80 text-white" aria-hidden="true">
          <AppIcon name="gallery" className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-black text-foreground">{title}</p>
        <p className="mt-0.5 text-[0.65rem] font-bold uppercase text-foreground-muted">{visibility === "public" ? "Público" : "Privado"}</p>
      </div>
    </Link>
  );
}
