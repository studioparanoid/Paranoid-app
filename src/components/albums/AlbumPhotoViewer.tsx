"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "@/components/AppIcon";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import type { AlbumPhoto } from "@/lib/albums";

type ViewerActionProps = {
  danger?: boolean;
  disabled?: boolean;
  icon: "messages" | "save" | "star" | "trash";
  label: string;
  onClick: () => void;
};

function ViewerAction({ danger = false, disabled = false, icon, label, onClick }: ViewerActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring pressable flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 px-2 text-[0.65rem] font-bold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        danger ? "text-red-500 hover:text-red-400" : "text-zinc-300 hover:text-white"
      }`}
    >
      <AppIcon name={icon} className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

export function AlbumPhotoViewer({
  photos,
  initialPhotoId,
  albumTitle,
  canDelete,
  onClose,
  onSave,
  onFavorite,
  onDelete,
  onOpenComments,
  busy,
}: {
  photos: AlbumPhoto[];
  initialPhotoId: string;
  albumTitle: string;
  canDelete: boolean;
  onClose: () => void;
  onSave: (photo: AlbumPhoto) => void;
  onFavorite: (photo: AlbumPhoto) => void;
  onDelete: (photo: AlbumPhoto) => void;
  onOpenComments: (photo: AlbumPhoto) => void;
  busy: boolean;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activePhotoId, setActivePhotoId] = useState(initialPhotoId);
  const activeIndex = Math.max(0, photos.findIndex((photo) => photo.id === activePhotoId));
  const activePhoto = photos[activeIndex] || photos[0];
  useDialogBehavior({ open: true, onClose, containerRef: viewerRef, initialFocusRef: closeButtonRef });

  useEffect(() => {
    const target = containerRef.current?.querySelector<HTMLElement>(`[data-photo-id="${initialPhotoId}"]`);
    if (target && containerRef.current) containerRef.current.scrollTop = target.offsetTop;
  }, [initialPhotoId]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    const nextIndex = Math.min(photos.length - 1, Math.max(0, Math.round(container.scrollTop / container.clientHeight)));
    const nextPhoto = photos[nextIndex];
    if (nextPhoto && nextPhoto.id !== activePhotoId) setActivePhotoId(nextPhoto.id);
  }

  if (!activePhoto) return null;

  return createPortal(
    <div
      ref={viewerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotografias de ${albumTitle}`}
      className="fixed inset-0 z-[80] isolate h-[100dvh] w-screen overflow-hidden bg-black text-white"
      data-testid="album-photo-viewer"
    >
      <header className="fixed inset-x-0 top-0 z-[82] border-b border-white/10 bg-black pt-[env(safe-area-inset-top)]">
        <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-center px-16">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar fotografias"
            className="focus-ring pressable absolute left-2 grid h-11 w-11 place-items-center text-zinc-300 hover:text-white sm:left-4"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-black text-white">{albumTitle}</p>
            <p className="mt-0.5 text-[0.65rem] font-bold tabular-nums text-zinc-500">{activeIndex + 1} / {photos.length}</p>
          </div>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, index) => (
          <section
            key={photo.id}
            data-photo-id={photo.id}
            aria-label={`Foto ${index + 1} de ${photos.length}`}
            className="flex h-full min-h-full snap-start snap-always items-center justify-center overflow-hidden px-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] sm:px-6"
          >
            <img
              src={photo.image_url}
              alt={`Foto ${index + 1} do álbum ${albumTitle}`}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain [-webkit-touch-callout:none]"
            />
          </section>
        ))}
      </div>

      <footer
        className="fixed inset-x-0 bottom-0 z-[82] border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]"
        data-testid="album-photo-actions"
      >
        <div className={`mx-auto grid min-h-[4.75rem] max-w-lg ${canDelete ? "grid-cols-4" : "grid-cols-3"}`}>
          <ViewerAction icon="star" label="Favorito" disabled={busy} onClick={() => onFavorite(activePhoto)} />
          <ViewerAction icon="messages" label="Comentar" onClick={() => onOpenComments(activePhoto)} />
          <ViewerAction icon="save" label="Guardar" disabled={busy} onClick={() => onSave(activePhoto)} />
          {canDelete && <ViewerAction danger icon="trash" label="Apagar" disabled={busy} onClick={() => onDelete(activePhoto)} />}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
