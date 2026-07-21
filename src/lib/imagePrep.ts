const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function prepareAlbumImage(file: File, maxDimension = 1600) {
  if (!acceptedTypes.includes(file.type)) throw new Error("Escolhe uma imagem JPEG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem não pode ultrapassar 5 MB.");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return new File([blob], "foto.webp", { type: "image/webp" });
}
