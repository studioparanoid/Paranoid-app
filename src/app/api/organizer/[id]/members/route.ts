import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

async function authorize(organizerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }) };

  const { data: allowed } = await supabase.rpc("organizer_has_permission", {
    requested_organizer_id: organizerId,
    requested_permission: "team",
  });
  if (!allowed) return { error: NextResponse.json({ error: "Sem permissão para gerir a equipa." }, { status: 403 }) };

  return { user };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id);
  if ("error" in access) return access.error;

  const admin = getRequiredSupabaseAdminClient();
  const { data: members, error } = await admin
    .from("organizer_members")
    .select("id,user_id,role,status,invited_at,accepted_at,created_at")
    .eq("organizer_id", id)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Não foi possível carregar a equipa." }, { status: 500 });

  const userIds = (members || []).map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id,display_name,email").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const enriched = (members || []).map((member) => ({
    ...member,
    displayName: profileById.get(member.user_id)?.display_name || null,
    email: profileById.get(member.user_id)?.email || null,
  }));

  return NextResponse.json({ members: enriched });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" ? "admin" : "member";
  if (!email) return NextResponse.json({ error: "Indica um email válido." }, { status: 400 });

  const admin = getRequiredSupabaseAdminClient();

  const { data: organizer } = await admin.from("organizers").select("name").eq("id", id).maybeSingle();
  const { data: invitee } = await admin.from("profiles").select("id,display_name").eq("email", email).maybeSingle();
  if (!invitee) return NextResponse.json({ error: "Não encontrámos nenhuma conta Paranoid com este email." }, { status: 404 });

  const { data: existing } = await admin
    .from("organizer_members")
    .select("id,status")
    .eq("organizer_id", id)
    .eq("user_id", invitee.id)
    .maybeSingle();

  if (existing?.status === "active") return NextResponse.json({ error: "Esta pessoa já faz parte da equipa." }, { status: 400 });
  if (existing?.status === "invited") return NextResponse.json({ error: "Já existe um convite pendente para esta pessoa." }, { status: 400 });

  const { error: upsertError } = await admin
    .from("organizer_members")
    .upsert(
      { organizer_id: id, user_id: invitee.id, role, status: "invited", invited_at: new Date().toISOString() },
      { onConflict: "organizer_id,user_id" },
    );

  if (upsertError) return NextResponse.json({ error: "Não foi possível criar o convite." }, { status: 500 });

  let emailSent = false;
  try {
    const organizerName = organizer?.name || "um organizador";
    await sendTransactionalEmail({
      to: email,
      subject: `Convite para a equipa de ${organizerName} — Paranoid`,
      text: `${invitee.display_name || "Olá"}, foste convidado para a equipa de ${organizerName} na Paranoid. Entra na tua conta e vai a Perfil > Convites pendentes para aceitar.`,
      html: `<div style="font-family:sans-serif;color:#111;"><p>Foste convidado para a equipa de <strong>${organizerName}</strong> na Paranoid.</p><p>Entra na tua conta e vai a Perfil &gt; Convites pendentes para aceitar.</p></div>`,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  return NextResponse.json({ ok: true, emailSent });
}
