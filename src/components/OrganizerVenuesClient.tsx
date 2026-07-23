"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CityCombobox } from "@/components/profile/CityCombobox";
import { Button, LoadingButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getMyOrganizerMemberships } from "@/lib/organizer-members";
import { supabase } from "@/lib/supabase/public";

type Organizer = { id: string; slug: string; name: string };
type Venue = { id: string; slug: string; name: string; city: string | null; verified: boolean | null };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function OrganizerVenuesClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
    const memberships = await getMyOrganizerMemberships();
    const orgs = memberships.flatMap((membership) => (membership.organizers ? [{ id: membership.organizers.id, slug: membership.organizers.slug, name: membership.organizers.name }] : []));
    setOrganizers(orgs);
    setOrganizerId(orgs[0]?.id || "");
    setLoading(false);
  }

  async function loadVenues(id: string) {
    if (!id) return;
    setVenuesLoading(true);
    const { data, error } = await supabase.from("venues").select("id,slug,name,city,verified").eq("organizer_id", id).order("name");
    if (error) toast({ message: "Não foi possível carregar os espaços.", tone: "error" });
    setVenues((data || []) as Venue[]);
    setVenuesLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!organizerId) return;
    const timer = window.setTimeout(() => { void loadVenues(organizerId); }, 0);
    return () => window.clearTimeout(timer);
  }, [organizerId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organizerId || !name.trim() || !city.trim() || creating) return;
    setCreating(true);
    try {
      const baseSlug = slugify(name) || "espaco";
      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const { data: existing } = await supabase.from("venues").select("id").eq("slug", slug).maybeSingle();
        if (!existing) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const { error } = await supabase.from("venues").insert({
        organizer_id: organizerId,
        slug,
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        instagram: instagram.trim() || null,
        verified: false,
      });
      if (error) throw new Error(error.message);

      toast({ message: "Espaço adicionado.", tone: "success" });
      setName(""); setCity(""); setAddress(""); setDescription(""); setInstagram(""); setShowForm(false);
      await loadVenues(organizerId);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível adicionar o espaço.", tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (organizers.length === 0) return <EmptyState title="Esta conta ainda não gere nenhum organizador." actionLabel="Voltar ao painel" actionHref="/organizador" />;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">Organizador</p>
          <h1 className="mt-2 text-4xl font-black leading-none">Espaços.</h1>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>{showForm ? "Fechar" : "Adicionar espaço"}</Button>
      </header>

      {organizers.length > 1 && (
        <label className="mb-6 block max-w-sm">
          <span className="mb-2 block text-xs font-bold text-foreground-muted">Organizador</span>
          <select value={organizerId} onChange={(event) => setOrganizerId(event.target.value)} className="w-full rounded border border-border bg-black px-4 py-3">
            {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}
          </select>
        </label>
      )}

      {showForm && (
        <Card className="mb-6 p-5">
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
            <LoadingButton type="submit" loading={creating} loadingText="A guardar...">Adicionar espaço</LoadingButton>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {venuesLoading && <LoadingSkeleton rows={3} />}
        {!venuesLoading && venues.length === 0 && <EmptyState title="Ainda não tens espaços." description="Adiciona o primeiro para o poderes usar nos teus eventos." />}
        {!venuesLoading && venues.map((venue) => (
          <Card key={venue.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">{venue.name}</p>
              <p className="text-xs text-foreground-muted">{venue.city}{venue.verified ? " · Verificado" : ""}</p>
            </div>
            <Link href={`/organizador/espacos/${venue.id}`} className="pressable focus-ring text-sm font-bold text-foreground-muted hover:text-foreground">Editar</Link>
          </Card>
        ))}
      </div>

      <Link href="/organizador" className="pressable focus-ring mt-6 inline-block text-sm font-bold text-foreground-muted hover:text-foreground">Voltar ao painel</Link>
    </div>
  );
}
