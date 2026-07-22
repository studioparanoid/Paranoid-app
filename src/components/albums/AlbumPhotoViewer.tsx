"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/ui/Button";
import type { AlbumPhoto } from "@/lib/albums";

export function AlbumPhotoViewer({
  photos,
  initialPhotoId,
  onClose,
  onSave,
  onFavorite,
  onOpenComments,
  busy,
}: {
  photos: AlbumPhoto[];
  initialPhotoId: string;
  onClose: () => void;
  onSave: (photo: AlbumPhoto) => void;
  onFavorite: (photo: AlbumPhoto) => void;
  onOpenComments: (photo: AlbumPhoto) => void;
  busy: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const target = containerRef.current?.querySelector<HTMLElement>(`[data-photo-id="${initialPhotoId}"]`);
    target?.scrollIntoView({ block: "start" });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      html.style.overflow = previousOverflow;
      html.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[110] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black [-webkit-overflow-scrolling:touch]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="pressable focus-ring fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-[111] grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white"
      >
        <AppIcon name="close" />
      </button>

      {photos.map((photo) => (
        <section
          key={photo.id}
          data-photo-id={photo.id}
          className="relative flex min-h-[100dvh] snap-start snap-always items-center justify-center"
        >
          <img src={photo.image_url} alt="" className="max-h-[100dvh] w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/75 to-transparent px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-12">
            <IconButton label="Adicionar aos favoritos" disabled={busy} onClick={() => onFavorite(photo)} className="text-white hover:bg-white/15">
              <AppIcon name="star" />
            </IconButton>
            <IconButton label="Comentar" onClick={() => onOpenComments(photo)} className="text-white hover:bg-white/15">
              <AppIcon name="messages" />
            </IconButton>
            <IconButton label="Guardar no telemóvel" disabled={busy} onClick={() => onSave(photo)} className="ml-auto text-white hover:bg-white/15">
              <AppIcon name="save" />
            </IconButton>
          </div>
        </section>
      ))}
    </div>
  );
}
