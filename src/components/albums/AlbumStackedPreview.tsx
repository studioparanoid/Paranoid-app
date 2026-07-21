"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

export function AlbumStackedPreview({ photos, title, href }: { photos: string[]; title: string; href: string }) {
  const stack = photos.slice(0, 4);
  const rotations = [-6, 3, -2, 6];

  return (
    <Link href={href} className="pressable focus-ring group block">
      <div className="relative aspect-square w-full">
        {stack.length === 0 && (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-surface text-xs font-bold text-foreground-muted">
            Sem fotos
          </div>
        )}
        {stack.map((photo, index) => (
          <div
            key={index}
            className="absolute inset-3 overflow-hidden rounded-lg border border-border shadow-card transition-transform"
            style={{ zIndex: stack.length - index, transform: `translate(${index * 4}px, ${index * -4}px) rotate(${rotations[index] || 0}deg)` }}
          >
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      <p className="mt-3 truncate text-sm font-black text-foreground">{title}</p>
    </Link>
  );
}
