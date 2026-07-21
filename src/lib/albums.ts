import { prepareAlbumImage } from "@/lib/imagePrep";
import { supabase } from "@/lib/supabase/public";

export type AlbumVisibility = "public" | "private";
export type AlbumEntityType = "artist" | "organizer" | "venue";

export type PhotoAlbum = {
  id: string;
  owner_user_id: string;
  entity_type: AlbumEntityType | null;
  entity_id: string | null;
  title: string;
  visibility: AlbumVisibility;
  join_code: string;
  created_at: string;
  updated_at: string;
};

export type AlbumPhoto = {
  id: string;
  album_id: string;
  uploaded_by: string;
  image_url: string;
  created_at: string;
};

export type AlbumComment = {
  id: string;
  photo_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const albumColumns = "id,owner_user_id,entity_type,entity_id,title,visibility,join_code,created_at,updated_at";

export async function createAlbum(input: {
  title: string;
  visibility: AlbumVisibility;
  entityType?: AlbumEntityType | null;
  entityId?: string | null;
}): Promise<PhotoAlbum> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const { data, error } = await supabase
    .from("photo_albums")
    .insert({
      owner_user_id: user.id,
      title: input.title.trim(),
      visibility: input.visibility,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
    })
    .select(albumColumns)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAlbum(id: string): Promise<PhotoAlbum | null> {
  const { data, error } = await supabase.from("photo_albums").select(albumColumns).eq("id", id).maybeSingle();
  if (error) {
    console.error("Erro ao carregar álbum:", error);
    return null;
  }
  return data;
}

export async function listMyAlbums(): Promise<PhotoAlbum[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [owned, memberOf] = await Promise.all([
    supabase.from("photo_albums").select(albumColumns).eq("owner_user_id", user.id),
    supabase.from("album_members").select("photo_albums(" + albumColumns + ")").eq("user_id", user.id),
  ]);

  if (owned.error) console.error("Erro ao carregar álbuns:", owned.error);
  if (memberOf.error) console.error("Erro ao carregar álbuns partilhados:", memberOf.error);

  const memberAlbums = ((memberOf.data || []) as unknown as Array<{ photo_albums: PhotoAlbum | null }>)
    .flatMap((row) => (row.photo_albums ? [row.photo_albums] : []));

  const byId = new Map<string, PhotoAlbum>();
  for (const album of [...(owned.data || []), ...memberAlbums]) byId.set(album.id, album);
  return Array.from(byId.values()).sort((first, second) => second.updated_at.localeCompare(first.updated_at));
}

export async function listPublicAlbumsForEntity(entityType: AlbumEntityType, entityId: string): Promise<PhotoAlbum[]> {
  const { data, error } = await supabase
    .from("photo_albums")
    .select(albumColumns)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar álbuns públicos:", error);
    return [];
  }
  return data || [];
}

export async function listCoverPhotosForAlbums(albumIds: string[], perAlbum = 4): Promise<Record<string, string[]>> {
  if (albumIds.length === 0) return {};

  const { data, error } = await supabase
    .from("album_photos")
    .select("album_id,image_url,created_at")
    .in("album_id", albumIds)
    .order("created_at", { ascending: false })
    .limit(albumIds.length * perAlbum * 2);

  if (error) {
    console.error("Erro ao carregar capas dos álbuns:", error);
    return {};
  }

  const byAlbum: Record<string, string[]> = {};
  for (const row of data || []) {
    const bucket = byAlbum[row.album_id] || (byAlbum[row.album_id] = []);
    if (bucket.length < perAlbum) bucket.push(row.image_url);
  }
  return byAlbum;
}

export async function uploadAlbumPhoto(albumId: string, file: File): Promise<string> {
  const prepared = await prepareAlbumImage(file);
  const path = `${albumId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("album-photos").upload(path, prepared, { cacheControl: "3600", contentType: prepared.type, upsert: false });
  if (error) throw new Error("Não foi possível enviar a foto.");
  return supabase.storage.from("album-photos").getPublicUrl(path).data.publicUrl;
}

export async function addAlbumPhoto(albumId: string, imageUrl: string): Promise<AlbumPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const { data, error } = await supabase
    .from("album_photos")
    .insert({ album_id: albumId, uploaded_by: user.id, image_url: imageUrl })
    .select("id,album_id,uploaded_by,image_url,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listAlbumPhotos(albumId: string): Promise<AlbumPhoto[]> {
  const { data, error } = await supabase
    .from("album_photos")
    .select("id,album_id,uploaded_by,image_url,created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar fotos:", error);
    return [];
  }
  return data || [];
}

export async function listAlbumComments(photoId: string): Promise<AlbumComment[]> {
  const { data, error } = await supabase
    .from("album_photo_comments")
    .select("id,photo_id,user_id,body,created_at")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error);
    return [];
  }
  return data || [];
}

export async function addAlbumComment(photoId: string, body: string): Promise<AlbumComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Escreve um comentário.");

  const { data, error } = await supabase
    .from("album_photo_comments")
    .insert({ photo_id: photoId, user_id: user.id, body: trimmed.slice(0, 2000) })
    .select("id,photo_id,user_id,body,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function joinAlbum(code: string): Promise<{ albumId: string }> {
  const response = await fetch(`/api/albums/join/${code}`, { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível entrar no álbum.");
  return payload;
}
