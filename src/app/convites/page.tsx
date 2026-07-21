"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button, LoadingButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { listMyPendingInvites, respondToOrganizerInvite, type PendingInvite } from "@/lib/organizerInvites";
import { supabase } from "@/lib/supabase/public";

export default function ConvitesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [actingId, setActingId] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setAuthenticated(Boolean(user));
    if (user) setInvites(await listMyPendingInvites());
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function respond(id: string, action: "accept" | "decline") {
    setActingId(id);
    try {
      await respondToOrganizerInvite(id, action);
      setInvites((current) => current.filter((invite) => invite.id !== id));
      toast({ message: action === "accept" ? "Convite aceite." : "Convite recusado.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível responder ao convite.", tone: "error" });
    } finally {
      setActingId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg"><LoadingSkeleton rows={3} /></section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Tens de iniciar sessão." actionLabel="Entrar" actionHref="/login?next=%2Fconvites" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Convites</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Convites pendentes</h1>
        </header>

        {invites.length === 0 && <EmptyState title="Sem convites pendentes." description="Quando um organizador te convidar para a equipa, aparece aqui." />}

        <div className="space-y-3">
          {invites.map((invite) => (
            <Card key={invite.id} className="p-4">
              <p className="text-lg font-black">{invite.organizers?.name || "Organizador"}</p>
              <div className="mt-3 flex gap-2">
                <LoadingButton loading={actingId === invite.id} loadingText="..." onClick={() => void respond(invite.id, "accept")}>Aceitar</LoadingButton>
                <Button variant="secondary" disabled={actingId === invite.id} onClick={() => void respond(invite.id, "decline")}>Recusar</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
