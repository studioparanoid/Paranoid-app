import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const admin = getRequiredSupabaseAdminClient();
  const { data: album, error } = await admin.from("photo_albums").select("id").eq("join_code", code).maybeSingle();
  if (error || !album) return NextResponse.json({ error: "Álbum não encontrado." }, { status: 404 });

  const { error: joinError } = await admin
    .from("album_members")
    .upsert({ album_id: album.id, user_id: user.id, role: "member" }, { onConflict: "album_id,user_id", ignoreDuplicates: true });

  if (joinError) return NextResponse.json({ error: "Não foi possível entrar no álbum." }, { status: 500 });

  return NextResponse.json({ albumId: album.id });
}
