"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useRef, useState } from "react";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function prepareProfileImage(file: File) {
  if (!acceptedTypes.includes(file.type)) throw new Error("Escolhe uma imagem JPEG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem não pode ultrapassar 5 MB.");

  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 1024, 1024);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return new File([blob], "perfil.webp", { type: "image/webp" });
}

export function ProfileImageField({ imageUrl, onFile, onRemove, disabled = false }: { imageUrl: string; onFile: (file: File) => void; onRemove: () => void; disabled?: boolean }) {
  const id = useId();
  const [localPreview, setLocalPreview] = useState("");
  const [error, setError] = useState("");
  const objectUrlRef = useRef("");
  const preview = localPreview || imageUrl;

  useEffect(() => {
    return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
  }, []);

  async function selectFile(nextFile?: File) {
    if (!nextFile) return;
    setError("");
    try {
      const prepared = await prepareProfileImage(nextFile);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(prepared);
      setLocalPreview(objectUrlRef.current);
      onFile(prepared);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Imagem inválida."); }
  }

  return <fieldset className="sm:col-span-2" disabled={disabled}>
    <legend className="mb-2 text-xs font-bold text-[var(--foreground-muted)]">Foto de perfil</legend>
    <div className="flex flex-wrap items-center gap-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] text-xl font-black text-danger">
        {preview ? <img src={preview} alt="Pré-visualização da foto de perfil" className="h-full w-full object-cover" /> : <span aria-hidden="true">P</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={id} className="pressable focus-ring inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--border-strong)] px-4 text-xs font-black">{preview ? "Substituir foto" : "Escolher foto"}</label>
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectFile(event.target.files?.[0])} className="sr-only" />
        {preview && <button type="button" onClick={() => { setLocalPreview(""); onRemove(); }} className="min-h-11 rounded-full border border-danger px-4 text-xs font-black text-danger">Remover</button>}
      </div>
    </div>
    <p className="mt-2 text-xs text-[var(--foreground-muted)]">JPEG, PNG ou WebP. Máximo 5 MB.</p>
    {error && <p className="mt-2 text-xs font-bold text-danger" role="alert">{error}</p>}
  </fieldset>;
}
