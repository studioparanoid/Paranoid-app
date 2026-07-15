import { supabase } from "@/lib/supabase/public";

export async function uploadProfileImage(userId: string, file: File) {
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("profile-images").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (error) throw new Error("Não foi possível carregar a foto.");
  return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
}

export async function removeProfileImage(url: string, userId: string) {
  const marker = "/profile-images/";
  const index = url.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(url.slice(index + marker.length));
  if (!path.startsWith(`${userId}/`)) return;
  await supabase.storage.from("profile-images").remove([path]);
}
