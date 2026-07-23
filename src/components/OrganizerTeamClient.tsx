"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getMyOrganizerMemberships } from "@/lib/organizer-members";
import { inviteOrganizerMember, listOrganizerMembers, type OrganizerTeamMember } from "@/lib/organizerInvites";
import { supabase } from "@/lib/supabase/public";

type Organizer = { id: string; slug: string; name: string };

const roleLabels: Record<string, string> = { owner: "Dono", admin: "Admin", member: "Membro" };
const statusLabels: Record<string, string> = { active: "Ativo", invited: "Convite pendente" };
const statusTones: Record<string, "neutral" | "success" | "warning"> = { active: "success", invited: "warning" };

export function OrganizerTeamClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [members, setMembers] = useState<OrganizerTeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const memberships = await getMyOrganizerMemberships();
    const orgs = memberships.flatMap((membership) => (membership.organizers ? [{ id: membership.organizers.id, slug: membership.organizers.slug, name: membership.organizers.name }] : []));
    setOrganizers(orgs);
    setOrganizerId(orgs[0]?.id || "");
    setLoading(false);
  }

  async function loadMembers(id: string) {
    if (!id) return;
    setMembersLoading(true);
    try {
      setMembers(await listOrganizerMembers(id));
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível carregar a equipa.", tone: "error" });
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!organizerId) return;
    const timer = window.setTimeout(() => { void loadMembers(organizerId); }, 0);
    return () => window.clearTimeout(timer);
  }, [organizerId]);

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!organizerId || !email.trim() || inviting) return;
    setInviting(true);
    try {
      const result = await inviteOrganizerMember(organizerId, email.trim(), role);
      toast({ message: result.emailSent ? "Convite enviado." : "Convite criado, mas o email pode não ter sido enviado.", tone: "success" });
      setEmail("");
      await loadMembers(organizerId);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar o convite.", tone: "error" });
    } finally {
      setInviting(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (organizers.length === 0) return <EmptyState title="Esta conta ainda não gere nenhum organizador." actionLabel="Voltar ao painel" actionHref="/organizador" />;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">Organizador</p>
        <h1 className="mt-2 text-4xl font-black leading-none">Equipa.</h1>
      </header>

      {organizers.length > 1 && (
        <label className="mb-6 block max-w-sm">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Organizador</span>
          <select value={organizerId} onChange={(event) => setOrganizerId(event.target.value)} className="w-full rounded border border-border bg-black px-4 py-3">
            {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}
          </select>
        </label>
      )}

      <Card className="p-5">
        <h2 className="text-lg font-black">Convidar</h2>
        <form onSubmit={submitInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.pt" className="flex-1" required />
          <select value={role} onChange={(event) => setRole(event.target.value as "admin" | "member")} className="focus-ring rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground">
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
          <LoadingButton type="submit" loading={inviting} loadingText="A enviar...">Convidar</LoadingButton>
        </form>
        <p className="mt-2 text-xs text-foreground-muted">A pessoa convidada tem de já ter uma conta Paranoid com este email.</p>
      </Card>

      <div className="mt-6 space-y-3">
        {membersLoading && <LoadingSkeleton rows={3} />}
        {!membersLoading && members.length === 0 && <EmptyState title="Ainda não há membros." />}
        {!membersLoading && members.map((member) => (
          <Card key={member.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">{member.displayName || member.email || "Utilizador"}</p>
              <p className="text-xs text-foreground-muted">{roleLabels[member.role] || member.role}</p>
            </div>
            <StatusBadge label={statusLabels[member.status] || member.status} tone={statusTones[member.status] || "neutral"} />
          </Card>
        ))}
      </div>

      <Link href="/organizador" className="pressable focus-ring mt-6 inline-block text-sm font-bold text-foreground-muted hover:text-foreground">Voltar ao painel</Link>
    </div>
  );
}
