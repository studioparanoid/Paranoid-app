import { supabase } from "@/lib/supabase/public";

export type OrganizerMemberRole = "owner" | "admin" | "member";
export type OrganizerMemberStatus = "invited" | "active" | "removed";

export type OrganizerTeamMember = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  displayName: string | null;
  email: string | null;
};

export type PendingInvite = {
  id: string;
  organizer_id: string;
  role: string;
  invited_at: string | null;
  organizers: { name: string; slug: string } | null;
};

export async function listOrganizerMembers(organizerId: string): Promise<OrganizerTeamMember[]> {
  const response = await fetch(`/api/organizer/${organizerId}/members`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a equipa.");
  return payload.members || [];
}

export async function inviteOrganizerMember(organizerId: string, email: string, role: "admin" | "member"): Promise<{ ok: boolean; emailSent: boolean }> {
  const response = await fetch(`/api/organizer/${organizerId}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o convite.");
  return payload;
}

export async function respondToOrganizerInvite(id: string, action: "accept" | "decline"): Promise<void> {
  const response = await fetch(`/api/organizer-members/${id}/respond`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível responder ao convite.");
}

export async function listMyPendingInvites(): Promise<PendingInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("organizer_members")
    .select("id,organizer_id,role,invited_at,organizers(name,slug)")
    .eq("user_id", user.id)
    .eq("status", "invited");

  if (error) {
    console.error("Erro ao carregar convites:", error);
    return [];
  }
  return (data || []) as unknown as PendingInvite[];
}
