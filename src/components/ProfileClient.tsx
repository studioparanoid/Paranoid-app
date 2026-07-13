"use client";

import { useEffect, useState } from "react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { SettingsList, type SettingsListItem } from "@/components/SettingsList";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, LinkButton, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { profileActivityNavigation, profilePurchaseNavigation } from "@/config/navigation";
import { supabase } from "@/lib/supabase/public";

type AccountType = "community" | "artist" | "organizer" | "venue";
type ProfileRow = {
  id: string;
  display_name: string | null;
  account_type: AccountType | null;
  account_status: string | null;
  artist_name: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  city: string | null;
  instagram_url: string | null;
  entity_id: string | null;
  entity_slug: string | null;
  preferred_cities: string[] | null;
  preferred_categories: string[] | null;
};

const cities = ["Pombal", "Leiria", "Coimbra", "Figueira da Foz", "Caldas da Rainha", "Marinha Grande"];
const categories = ["Concertos", "Festivais", "DJ Sets", "Cinema", "Exposições", "Mercados", "Workshops", "Teatro", "Outros"];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function publicPath(type: AccountType, slug: string | null) {
  if (!slug) return null;
  if (type === "artist") return `/artistas/${slug}`;
  if (type === "organizer") return `/organizadores/${slug}`;
  if (type === "venue") return `/espacos/${slug}`;
  return null;
}

function accountTypeLabel(type: AccountType) {
  if (type === "artist") return "Artista";
  if (type === "organizer") return "Organizador";
  if (type === "venue") return "Espaço";
  return "Comunidade";
}

export function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const { toast } = useToast();

  async function loadProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [profileResponse, adminResponse] = await Promise.all([
      supabase.from("profiles").select("id,display_name,account_type,account_status,artist_name,organizer_name,venue_name,city,instagram_url,entity_id,entity_slug,preferred_cities,preferred_categories").eq("id", user.id).maybeSingle(),
      supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const nextProfile = profileResponse.data as ProfileRow | null;
    setUserId(user.id);
    setEmail(user.email || "");
    setIsAdmin(Boolean(adminResponse.data));
    setProfile(nextProfile);
    setDisplayName(nextProfile?.display_name || "");
    setCity(nextProfile?.city || "");
    setInstagram(nextProfile?.instagram_url || "");
    setPreferredCities(nextProfile?.preferred_cities || []);
    setPreferredCategories(nextProfile?.preferred_categories || []);

    const accountType = nextProfile?.account_type || "community";
    const fallbackName = accountType === "artist" ? nextProfile?.artist_name : accountType === "organizer" ? nextProfile?.organizer_name : accountType === "venue" ? nextProfile?.venue_name : nextProfile?.display_name;
    setEntityName(fallbackName || "");
    setDescription("");

    if (nextProfile?.entity_id && accountType !== "community") {
      const table = accountType === "artist" ? "artists" : accountType === "organizer" ? "organizers" : "venues";
      const entityResponse = await supabase.from(table).select("name,city,description").eq("id", nextProfile.entity_id).maybeSingle();
      if (entityResponse.data) {
        setEntityName(entityResponse.data.name || fallbackName || "");
        setCity(entityResponse.data.city || nextProfile.city || "");
        setDescription(entityResponse.data.description || "");
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProfile(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setMessage("");
    const type = profile?.account_type || "community";
    const { error } = await supabase.rpc("update_my_public_profile", {
      p_display_name: displayName.trim() || entityName.trim() || null,
      p_entity_name: type === "community" ? null : entityName.trim() || null,
      p_city: city.trim() || null,
      p_instagram_url: instagram.trim() || null,
      p_description: type === "community" ? null : description.trim() || null,
      p_preferred_cities: preferredCities,
      p_preferred_categories: preferredCategories,
    });
    setSaving(false);
    if (error) {
      setMessage(`Não foi possível guardar: ${error.message}`);
      toast({ message: "Não foi possível guardar o perfil.", tone: "error" });
      return;
    }
    setMessage("Perfil atualizado.");
    toast({ message: "Perfil atualizado.", tone: "success" });
    setEditing(false);
    await loadProfile();
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      toast({ message: "Não foi possível terminar a sessão.", tone: "error" });
      return;
    }
    window.location.href = "/";
  }

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!userId) return <div className="mx-auto max-w-lg py-16 text-center"><h1 className="text-4xl font-black">Entra na tua conta.</h1><p className="mt-3 text-sm text-zinc-500">Guarda eventos, segue a rede e consulta os teus bilhetes.</p><div className="mt-6 flex justify-center gap-3"><LinkButton href="/login">Entrar</LinkButton><LinkButton href="/registar" variant="secondary">Criar conta</LinkButton></div></div>;

  const accountType = profile?.account_type || "community";
  const approved = profile?.account_status === "approved";
  const entityPath = publicPath(accountType, profile?.entity_slug || null);
  const title = entityName || displayName || email.split("@")[0] || "Perfil";
  const activityItems: SettingsListItem[] = profileActivityNavigation.map((item) => ({ ...item, description: item.href === "/guardados" ? "Eventos que queres voltar a ver" : "Artistas, espaços e organizadores" }));
  const purchaseItems: SettingsListItem[] = profilePurchaseNavigation.map((item) => ({ ...item, description: item.href === "/bilhetes" ? "Carteira e códigos de entrada" : "Loja e compras" }));
  const creatorItems: SettingsListItem[] = [];
  if (approved && accountType === "organizer") {
    creatorItems.push(
      { href: "/submeter", label: "Submeter evento", description: "Publicar é gratuito", icon: "plus" },
      { href: "/organizador", label: "Área do organizador", description: "Eventos, destaques, loja e perfil", icon: "organizer" },
    );
  }
  if (approved && entityPath) creatorItems.push({ href: entityPath, label: "Ver perfil público", icon: accountType === "artist" ? "artist" : accountType === "venue" ? "venue" : "organizer" });

  return <div>
    <header className="flex items-center gap-4 border-b border-zinc-900 pb-6">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-red-950 bg-red-950/25 text-xl font-black text-red-500">{title.charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1"><h1 className="truncate text-3xl font-black">{title}</h1><p className="truncate text-sm text-zinc-600">{email}</p><div className="mt-2"><StatusBadge label={profile?.account_status === "pending" ? "Perfil pendente" : accountTypeLabel(accountType)} tone={profile?.account_status === "pending" ? "warning" : "neutral"} /></div></div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setEditing((value) => !value)} aria-expanded={editing} className="hidden sm:inline-flex">Editar perfil</Button>
    </header>

    {editing && <section className="slide-up border-b border-zinc-900 py-7">
      <SectionHeader title="Editar perfil" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={accountType === "community" ? "Nome" : "Nome público"} value={accountType === "community" ? displayName : entityName} onChange={accountType === "community" ? setDisplayName : setEntityName} />
        <Field label="Localização preferida" value={city} onChange={setCity} />
        <Field label="Instagram" value={instagram} onChange={setInstagram} />
        {accountType !== "community" && <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-zinc-500">Descrição pública</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full resize-none rounded border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-800" /></label>}
        <PreferencePicker label="Cidades" values={cities} selected={preferredCities} onToggle={(value) => setPreferredCities((current) => toggle(current, value))} />
        <PreferencePicker label="Categorias" values={categories} selected={preferredCategories} onToggle={(value) => setPreferredCategories((current) => toggle(current, value))} />
      </div>
      {message && <p className="mt-4 text-sm text-zinc-400" role="status">{message}</p>}
      <div className="mt-5 flex gap-3"><LoadingButton type="button" onClick={saveProfile} loading={saving} loadingText="A guardar...">Guardar</LoadingButton><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button></div>
    </section>}

    <div className="grid gap-x-10 gap-y-8 py-8 lg:grid-cols-2">
      <ProfileSection title="A minha atividade" items={activityItems} />
      <ProfileSection title="A minha conta" items={[{ label: "Dados e preferências", description: "Nome, localização e categorias", icon: "settings", onClick: () => setEditing(true) }, { label: signingOut ? "A terminar sessão..." : "Terminar sessão", icon: "logout", tone: "danger", onClick: signOut }]} />
      <ProfileSection title="Bilhetes e compras" items={purchaseItems} />
      {creatorItems.length > 0 && <ProfileSection title="Criar e gerir" items={creatorItems} />}
      {approved && accountType === "organizer" && <ProfileSection title="Visibilidade e parcerias" items={[{ href: "/organizador/destaques", label: "Destaques e Frequency", icon: "visibility" }, { href: "/patrocinar", label: "Parcerias Paranoid", icon: "organizer" }]} />}
      {isAdmin && <ProfileSection title="Administração" items={[{ href: "/admin", label: "Painel administrativo", description: "Conteúdo, utilizadores, comercial e loja", icon: "admin" }]} />}
    </div>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-xs font-bold text-zinc-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-800" /></label>;
}

function PreferencePicker({ label, values, selected, onToggle }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-bold text-zinc-500">{label}</legend><div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => onToggle(value)} aria-pressed={selected.includes(value)} className={`pressable focus-ring rounded-full border px-3 py-2 text-xs font-bold ${selected.includes(value) ? "border-zinc-100 bg-zinc-100 text-black" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>{value}</button>)}</div></fieldset>;
}

function ProfileSection({ title, items }: { title: string; items: SettingsListItem[] }) {
  return <section><SectionHeader title={title} /><SettingsList items={items} /></section>;
}
