"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CityCombobox } from "@/components/profile/CityCombobox";
import { LoadingButton } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

export function OrganizerVenueEditClient({ venueId }: { venueId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: venue } = await supabase.from("venues").select("id,name,city,address,description,instagram,organizer_id").eq("id", venueId).maybeSingle();
    if (!venue?.organizer_id) {
      setLoading(false);
      return;
    }
    const { data: membership } = await supabase.from("organizer_members").select("id").eq("organizer_id", venue.organizer_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!membership) {
      setLoading(false);
      return;
    }
    setAllowed(true);
    setName(venue.name || "");
    setCity(venue.city || "");
    setAddress(venue.address || "");
    setDescription(venue.description || "");
    setInstagram(venue.instagram || "");
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [venueId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !city.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("venues").update({
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        instagram: instagram.trim() || null,
      }).eq("id", venueId);
      if (error) throw new Error(error.message);
      toast({ message: "Espaço atualizado.", tone: "success" });
      router.push("/organizador/espacos");
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível guardar.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!allowed) return <EmptyState title="Não é possível editar este espaço." description="Ou não existe, ou não pertence a um organizador que geres." actionLabel="Voltar aos espaços" actionHref="/organizador/espacos" />;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">Organizador</p>
        <h1 className="mt-2 text-4xl font-black leading-none">Editar espaço.</h1>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Nome do espaço</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} />
        </label>
        <CityCombobox value={city} onChange={setCity} required />
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Morada (opcional)</span>
          <Input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Descrição (opcional)</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={600} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Instagram (opcional)</span>
          <Input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="instagram.com/..." maxLength={200} />
        </label>
        <LoadingButton type="submit" loading={saving} loadingText="A guardar...">Guardar</LoadingButton>
      </form>
    </div>
  );
}
