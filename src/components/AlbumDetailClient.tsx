"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import * as QRCode from "qrcode";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AppIcon } from "@/components/AppIcon";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, IconButton, LoadingButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  addAlbumComment,
  addAlbumPhoto,
  addPhotosToFavorites,
  deleteAlbumPhoto,
  getAlbum,
  listAlbumComments,
  listAlbumPhotos,
  renameAlbum,
  uploadAlbumPhoto,
  type AlbumComment,
  type AlbumPhoto,
  type PhotoAlbum,
} from "@/lib/albums";
import { supabase } from "@/lib/supabase/public";

function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AlbumDetailClient({ albumId }: { albumId: string }) {
  const { toast } = useToast();
  const galleryInputId = useId();
  const cameraInputId = useId();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [album, setAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [focusedPhoto, setFocusedPhoto] = useState<AlbumPhoto | null>(null);
  const [comments, setComments] = useState<AlbumComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [deletingPhotos, setDeletingPhotos] = useState(false);
  const [favoritingPhotos, setFavoritingPhotos] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || "");
    const [loadedAlbum, loadedPhotos] = await Promise.all([getAlbum(albumId), listAlbumPhotos(albumId)]);
    setAlbum(loadedAlbum);
    setPhotos(loadedPhotos);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [albumId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const imageUrl = await uploadAlbumPhoto(albumId, file);
        const photo = await addAlbumPhoto(albumId, imageUrl);
        setPhotos((current) => [photo, ...current]);
      }
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar a foto.", tone: "error" });
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  function togglePhotoSelected(photoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId); else next.add(photoId);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }

  function startLongPress(photoId: string) {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectMode(true);
      setSelectedIds(new Set([photoId]));
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePhotoActivate(photo: AlbumPhoto) {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectMode) {
      togglePhotoSelected(photo.id);
    } else {
      void openPhoto(photo);
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function deleteSelectedPhotos() {
    const targets = photos.filter((photo) => selectedIds.has(photo.id));
    if (targets.length === 0 || deletingPhotos) return;
    setDeletingPhotos(true);
    try {
      await Promise.all(targets.map((photo) => deleteAlbumPhoto(photo.id)));
      setPhotos(await listAlbumPhotos(albumId));
      toast({ message: targets.length === 1 ? "Foto apagada." : `${targets.length} fotos apagadas.`, tone: "success" });
      exitSelectMode();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível apagar as fotos.", tone: "error" });
    } finally {
      setDeletingPhotos(false);
    }
  }

  async function favoriteSelectedPhotos() {
    const targets = photos.filter((photo) => selectedIds.has(photo.id));
    if (targets.length === 0 || favoritingPhotos) return;
    setFavoritingPhotos(true);
    try {
      const added = await addPhotosToFavorites(targets);
      toast({ message: added > 0 ? `${added} foto${added === 1 ? "" : "s"} adicionada${added === 1 ? "" : "s"} aos favoritos.` : "Não foi possível adicionar aos favoritos.", tone: added > 0 ? "success" : "error" });
      exitSelectMode();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível adicionar aos favoritos.", tone: "error" });
    } finally {
      setFavoritingPhotos(false);
    }
  }

  async function fetchPhotoFile(photo: AlbumPhoto, index: number): Promise<File | null> {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1] || "jpg";
      return new File([blob], `foto-${index + 1}.${extension}`, { type: blob.type || "image/jpeg" });
    } catch {
      return null;
    }
  }

  async function savePhotos(photosToSave: AlbumPhoto[]) {
    if (photosToSave.length === 0 || savingPhotos) return;
    setSavingPhotos(true);
    try {
      const files = (await Promise.all(photosToSave.map((photo, index) => fetchPhotoFile(photo, index))))
        .filter((file): file is File => Boolean(file));
      if (files.length === 0) throw new Error("Não foi possível preparar as fotos.");

      const shareData = { files, title: album?.title || "Fotos" };
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        files.forEach((file) => {
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        });
        toast({ message: files.length === 1 ? "Foto descarregada." : `${files.length} fotos descarregadas.`, tone: "success" });
      }
      exitSelectMode();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast({ message: "Não foi possível guardar as fotos.", tone: "error" });
    } finally {
      setSavingPhotos(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!album) return <EmptyState title="Não encontramos este álbum." description="Pode ter sido removido ou não teres acesso a ele." actionLabel="Voltar ao perfil" actionHref="/perfil" />;

  const isOwner = album.owner_user_id === userId;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/albuns/entrar/${album.join_code}` : "";

  async function openShare() {
    setShareOpen(true);
    if (qrCodeUrl || !joinUrl) return;
    try {
      setQrCodeUrl(await QRCode.toDataURL(joinUrl, { width: 280, margin: 1, color: { dark: "#0b0b0b", light: "#f2f1ec" } }));
    } catch {
      setQrCodeUrl("");
    }
  }

  function startRenaming() {
    if (!album) return;
    setTitleDraft(album.title);
    setRenamingTitle(true);
  }

  async function saveRenamedTitle() {
    if (!album || savingTitle) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === album.title) {
      setRenamingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await renameAlbum(album.id, trimmed);
      setAlbum(updated);
      setRenamingTitle(false);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível mudar o nome.", tone: "error" });
    } finally {
      setSavingTitle(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast({ message: "Link copiado.", tone: "success" });
    } catch {
      toast({ message: "Não foi possível copiar o link.", tone: "error" });
    }
  }

  async function openPhoto(photo: AlbumPhoto) {
    setFocusedPhoto(photo);
    setCommentBody("");
    setCommentsLoading(true);
    setComments(await listAlbumComments(photo.id));
    setCommentsLoading(false);
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!focusedPhoto || !commentBody.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const comment = await addAlbumComment(focusedPhoto.id, commentBody);
      setComments((current) => [...current, comment]);
      setCommentBody("");
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar o comentário.", tone: "error" });
    } finally {
      setSendingComment(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Álbum</p>
          {renamingTitle ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                maxLength={120}
                autoFocus
                className="focus-ring min-w-0 rounded-md border border-input-border bg-input px-3 py-1.5 text-2xl font-black text-foreground outline-none sm:text-3xl"
              />
              <IconButton label="Guardar nome" onClick={() => void saveRenamedTitle()} disabled={savingTitle}><AppIcon name="check" /></IconButton>
              <IconButton label="Cancelar" variant="ghost" onClick={() => setRenamingTitle(false)} disabled={savingTitle}><AppIcon name="close" /></IconButton>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <h1 className="truncate text-3xl font-black sm:text-4xl">{album.title}</h1>
              {isOwner && <IconButton label="Mudar nome do álbum" variant="ghost" onClick={startRenaming}><AppIcon name="edit" className="h-4 w-4" /></IconButton>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={album.visibility === "public" ? "Público" : "Privado"} tone={album.visibility === "public" ? "success" : "neutral"} />
          {isOwner && <Button size="sm" variant="secondary" onClick={() => void openShare()}>Partilhar</Button>}
        </div>
      </div>

      <Card className="mb-6 flex flex-wrap gap-2 p-4">
        <label htmlFor={galleryInputId}>
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => galleryInputRef.current?.click()}>Adicionar foto</Button>
        </label>
        <input ref={galleryInputRef} id={galleryInputId} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void handleFiles(event.target.files)} />

        <label htmlFor={cameraInputId}>
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => cameraInputRef.current?.click()}>Tirar foto</Button>
        </label>
        <input ref={cameraInputRef} id={cameraInputId} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void handleFiles(event.target.files)} />

        {uploading && <span className="self-center text-xs font-bold text-foreground-muted">A enviar...</span>}
      </Card>

      {photos.length > 0 && !selectMode && <p className="mb-3 text-xs font-bold text-foreground-muted">Mantém premida uma foto para selecionar várias.</p>}

      {photos.length === 0 && <EmptyState title="Ainda não há fotos." description={isOwner ? "Adiciona a primeira foto acima." : "Quando alguém adicionar fotos, aparecem aqui."} />}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pb-24 sm:grid-cols-3">
          {photos.map((photo) => {
            const selected = selectedIds.has(photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onPointerDown={() => startLongPress(photo.id)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onClick={() => handlePhotoActivate(photo)}
                className={`pressable focus-ring relative aspect-square touch-manipulation select-none overflow-hidden rounded-lg border bg-surface [-webkit-touch-callout:none] ${selected ? "border-accent" : "border-border"}`}
              >
                <img src={photo.image_url} alt="" draggable={false} className="h-full w-full object-cover" />
                {selectMode && (
                  <span className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 ${selected ? "border-accent bg-accent text-white" : "border-white/80 bg-black/30"}`}>
                    {selected && <AppIcon name="check" className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-[var(--background)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
            <IconButton label="Cancelar seleção" variant="secondary" onClick={exitSelectMode}><AppIcon name="close" /></IconButton>
            <p className="text-sm font-bold text-foreground-muted">{selectedIds.size} selecionada{selectedIds.size === 1 ? "" : "s"}</p>
            <div className="flex items-center gap-2">
              <IconButton label="Guardar no telemóvel" disabled={savingPhotos} onClick={() => void savePhotos(photos.filter((photo) => selectedIds.has(photo.id)))}><AppIcon name="save" /></IconButton>
              <IconButton label="Adicionar aos favoritos" disabled={favoritingPhotos} onClick={() => void favoriteSelectedPhotos()}><AppIcon name="star" /></IconButton>
              <IconButton label="Apagar" disabled={deletingPhotos} onClick={() => void deleteSelectedPhotos()} className="text-danger hover:bg-danger/10"><AppIcon name="trash" /></IconButton>
            </div>
          </div>
        </div>
      )}

      <Modal open={Boolean(focusedPhoto)} onClose={() => setFocusedPhoto(null)} title="Foto">
        {focusedPhoto && (
          <div>
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={focusedPhoto.image_url} alt="" className="max-h-[50vh] w-full object-contain bg-black" />
            </div>

            <div className="mt-3 flex justify-end">
              <IconButton label="Guardar no telemóvel" disabled={savingPhotos} onClick={() => void savePhotos([focusedPhoto])}><AppIcon name="save" /></IconButton>
            </div>

            <div className="mt-4 space-y-3">
              {commentsLoading && <LoadingSkeleton rows={2} />}
              {!commentsLoading && comments.length === 0 && <p className="text-sm text-foreground-muted">Ainda não há comentários.</p>}
              {!commentsLoading && comments.map((comment) => (
                <div key={comment.id} className={`max-w-[85%] rounded-lg border border-border px-3.5 py-2.5 text-sm ${comment.user_id === userId ? "ml-auto bg-surface" : "bg-card"}`}>
                  <p className="whitespace-pre-wrap">{comment.body}</p>
                  <p className="mt-1 text-[11px] text-foreground-muted">{formatCommentTime(comment.created_at)}</p>
                </div>
              ))}
            </div>

            <form onSubmit={submitComment} className="mt-4 flex gap-2">
              <Textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={2} maxLength={2000} placeholder="Escreve um comentário..." className="flex-1" />
              <LoadingButton type="submit" loading={sendingComment} loadingText="..." disabled={!commentBody.trim()}>Enviar</LoadingButton>
            </form>
          </div>
        )}
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Partilhar álbum" description="Quem ler este código com a câmara do telemóvel entra diretamente no álbum.">
        <div className="scale-in rounded-lg border border-zinc-800 bg-[#f2f1ec] p-4 text-black">
          {qrCodeUrl ? (
            <Image src={qrCodeUrl} alt="QR code de convite" width={224} height={224} unoptimized className="mx-auto h-56 w-56 rounded-2xl" />
          ) : (
            <div className="skeleton-shimmer flex h-56 items-center justify-center rounded-2xl border border-zinc-300">
              <p className="text-sm font-black text-zinc-500">A preparar o QR...</p>
            </div>
          )}
        </div>
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => void copyLink()}>Copiar link</Button>
      </Modal>
    </div>
  );
}
