"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CityCombobox } from "@/components/profile/CityCombobox";
import { LoadingButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createProfileClaim, type ProfileClaimAccountType } from "@/lib/profileClaims";
import { supabase } from "@/lib/supabase/public";

const accountTypeLabels: Record<ProfileClaimAccountType, string> = {
  artist: "Artista",
  organizer: "Organizador",
  venue: "Espaço",
};

export default function ReivindicarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [accountType, setAccountType] = useState<ProfileClaimAccountType>("artist");
  const [entityName, setEntityName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "artist" || type === "organizer" || type === "venue") setAccountType(type);
    const entityNameParam = params.get("entityName") || "";
    setEntityName(entityNameParam);
    setDisplayName(entityNameParam);
    setCity(params.get("city") || "");

    const { data: { user } } = await supabase.auth.getUser();
    setAuthenticated(Boolean(user));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!entityName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createProfileClaim({
        accountType,
        displayName: displayName.trim() || entityName.trim(),
        entityName,
        city: city || null,
        instagramUrl: instagramUrl || null,
      });
      toast({ message: "Pedido enviado. Vamos rever e confirmar.", tone: "success" });
      router.push("/perfil");
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar o pedido.", tone: "error" });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg"><LoadingSkeleton rows={4} /></section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Tens de iniciar sessão." description="Precisas de uma conta para reivindicar um perfil." actionLabel="Entrar" actionHref="/login?next=%2Freivindicar" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Reivindicar perfil</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Junta-te à rede.</h1>
          <p className="mt-2 text-sm text-foreground-muted">Diz-nos quem és e revemos o pedido para dares o próximo passo.</p>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Tipo de conta</span>
            <select value={accountType} onChange={(event) => setAccountType(event.target.value as ProfileClaimAccountType)} className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground">
              {(Object.keys(accountTypeLabels) as ProfileClaimAccountType[]).map((type) => (
                <option key={type} value={type}>{accountTypeLabels[type]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Nome {accountType === "venue" ? "do espaço" : accountType === "organizer" ? "do organizador" : "artístico"}</span>
            <Input value={entityName} onChange={(event) => setEntityName(event.target.value)} required maxLength={160} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Nome público a mostrar</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={160} placeholder={entityName || "Igual ao nome acima"} />
          </label>

          <CityCombobox value={city} onChange={setCity} />

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Instagram (opcional)</span>
            <Input value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="instagram.com/..." maxLength={200} />
          </label>

          <LoadingButton type="submit" loading={submitting} loadingText="A enviar..." className="w-full" disabled={!entityName.trim()}>Enviar pedido</LoadingButton>
        </form>
      </section>
    </main>
  );
}
