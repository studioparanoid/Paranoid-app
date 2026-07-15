"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { SettingsList, type SettingsListItem } from "@/components/SettingsList";
import { StatusBadge } from "@/components/StatusBadge";
import { AppearanceSettings } from "@/components/theme/AppearanceSettings";
import { themeLabel } from "@/components/theme/ThemeSelector";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button, LinkButton, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CityCombobox, isKnownPortugueseMunicipality } from "@/components/profile/CityCombobox";
import { GenreMultiSelect } from "@/components/profile/GenreMultiSelect";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { profileActivityNavigation, profilePurchaseNavigation } from "@/config/navigation";
import { removeProfileImage, uploadProfileImage } from "@/lib/profileImages";
import { artistCategories, maxProfileDescriptionLength, organizerTypes } from "@/lib/profileOptions";
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
  avatar_url: string | null;
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
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [organizerType, setOrganizerType] = useState("");
  const [organizerTypeOther, setOrganizerTypeOther] = useState("");
  const [artistCategory, setArtistCategory] = useState("");
  const [artistCategoryOther, setArtistCategoryOther] = useState("");
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const { toast } = useToast();
  const { preferredTheme } = useTheme();

  async function loadProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [profileResponse, adminResponse] = await Promise.all([
      supabase.from("profiles").select("id,display_name,account_type,account_status,artist_name,organizer_name,venue_name,city,instagram_url,entity_id,entity_slug,preferred_cities,preferred_categories,avatar_url").eq("id", user.id).maybeSingle(),
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
    setAvatarUrl(nextProfile?.avatar_url || "");
    setAvatarFile(null);
    setRemoveAvatar(false);
    setOrganizerType("");
    setOrganizerTypeOther("");
    setArtistCategory("");
    setArtistCategoryOther("");
    setMusicGenres([]);

    const accountType = nextProfile?.account_type || "community";
    const fallbackName = accountType === "artist" ? nextProfile?.artist_name : accountType === "organizer" ? nextProfile?.organizer_name : accountType === "venue" ? nextProfile?.venue_name : nextProfile?.display_name;
    setEntityName(fallbackName || "");
    setDescription("");

    if (nextProfile?.entity_id && accountType !== "community") {
      const entityResponse = accountType === "artist"
        ? await supabase.from("artists").select("name,city,description,image_url,artist_category,artist_category_other,music_genres").eq("id", nextProfile.entity_id).maybeSingle()
        : accountType === "organizer"
          ? await supabase.from("organizers").select("name,city,description,image_url,organizer_type,organizer_type_other").eq("id", nextProfile.entity_id).maybeSingle()
          : await supabase.from("venues").select("name,city,description,image_url").eq("id", nextProfile.entity_id).maybeSingle();
      if (entityResponse.data) {
        const entity = entityResponse.data as unknown as Record<string, unknown>;
        setEntityName(String(entity.name || fallbackName || ""));
        setCity(String(entity.city || nextProfile.city || ""));
        setDescription(String(entity.description || ""));
        setAvatarUrl(String(entity.image_url || nextProfile.avatar_url || ""));
        setOrganizerType(String(entity.organizer_type || ""));
        setOrganizerTypeOther(String(entity.organizer_type_other || ""));
        setArtistCategory(String(entity.artist_category || ""));
        setArtistCategoryOther(String(entity.artist_category_other || ""));
        setMusicGenres(Array.isArray(entity.music_genres) ? entity.music_genres.filter((value): value is string => typeof value === "string") : []);
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
    if (!isKnownPortugueseMunicipality(city)) { setMessage("Escolhe uma localidade da lista."); return; }
    if (description.length > maxProfileDescriptionLength) { setMessage(`A descrição não pode ultrapassar ${maxProfileDescriptionLength} caracteres.`); return; }
    setSaving(true);
    setMessage("");
    const type = profile?.account_type || "community";
    let nextAvatarUrl = removeAvatar ? "" : avatarUrl;
    try {
      if (avatarFile) nextAvatarUrl = await uploadProfileImage(userId, avatarFile);
    } catch {
      setSaving(false);
      setMessage("Não foi possível carregar a foto.");
      toast({ message: "Não foi possível carregar a foto.", tone: "error" });
      return;
    }

    const { error } = await supabase.rpc("update_my_public_profile", {
      p_display_name: displayName.trim() || entityName.trim() || null,
      p_entity_name: type === "community" ? null : entityName.trim() || null,
      p_city: city.trim() || null,
      p_instagram_url: instagram.trim() || null,
      p_description: type === "community" ? null : description.trim() || null,
      p_preferred_cities: preferredCities,
      p_preferred_categories: preferredCategories,
    });
    if (error) {
      setSaving(false);
      setMessage("Não foi possível guardar o perfil.");
      toast({ message: "Não foi possível guardar o perfil.", tone: "error" });
      return;
    }

    const { error: extendedError } = await supabase.rpc("update_my_extended_profile", {
      p_avatar_url: nextAvatarUrl || null,
      p_city: city.trim() || null,
      p_description: type === "community" ? null : description.trim() || null,
      p_organizer_type: type === "organizer" ? organizerType || null : null,
      p_organizer_type_other: type === "organizer" && organizerType === "Outro" ? organizerTypeOther.trim() || null : null,
      p_artist_category: type === "artist" ? artistCategory || null : null,
      p_artist_category_other: type === "artist" && artistCategory === "Outro" ? artistCategoryOther.trim() || null : null,
      p_music_genres: type === "artist" && artistCategory === "Música" ? musicGenres : [],
    });
    setSaving(false);
    if (extendedError) {
      setMessage("Os dados principais foram guardados, mas os detalhes do perfil não.");
      toast({ message: "Não foi possível guardar todos os detalhes.", tone: "error" });
      return;
    }
    if ((removeAvatar || avatarFile) && avatarUrl && avatarUrl !== nextAvatarUrl) await removeProfileImage(avatarUrl, userId);
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
    <AppearanceSettings open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    <header className="flex items-center gap-4 border-b border-zinc-900 pb-6">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-red-950 bg-red-950/25 text-xl font-black text-red-500">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${title}`} className="h-full w-full object-cover" /> : title.charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1"><h1 className="truncate text-3xl font-black">{title}</h1><p className="truncate text-sm text-zinc-600">{email}</p><div className="mt-2"><StatusBadge label={profile?.account_status === "pending" ? "Perfil pendente" : accountTypeLabel(accountType)} tone={profile?.account_status === "pending" ? "warning" : "neutral"} /></div></div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setEditing((value) => !value)} aria-expanded={editing} className="hidden sm:inline-flex">Editar perfil</Button>
    </header>

    {editing && <section className="slide-up border-b border-zinc-900 py-7">
      <SectionHeader title="Editar perfil" />
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileImageField imageUrl={removeAvatar ? "" : avatarUrl} onFile={(file) => { setAvatarFile(file); setRemoveAvatar(false); }} onRemove={() => { setAvatarFile(null); setRemoveAvatar(true); }} disabled={saving} />
        <Field label={accountType === "community" ? "Nome" : "Nome público"} value={accountType === "community" ? displayName : entityName} onChange={accountType === "community" ? setDisplayName : setEntityName} />
        <CityCombobox label="Cidade/localidade" value={city} onChange={setCity} />
        <Field label="Instagram" value={instagram} onChange={setInstagram} />
        {accountType === "organizer" && <><label><span className="mb-2 block text-xs font-bold text-zinc-500">Tipo</span><select value={organizerType} onChange={(event) => setOrganizerType(event.target.value)} className="h-12 w-full rounded border border-zinc-800 bg-black px-4 outline-none focus:border-red-800"><option value="">Escolher tipo</option>{organizerTypes.map((value) => <option key={value}>{value}</option>)}</select></label>{organizerType === "Outro" && <Field label="Especificar tipo" value={organizerTypeOther} onChange={setOrganizerTypeOther} />}</>}
        {accountType === "artist" && <><label><span className="mb-2 block text-xs font-bold text-zinc-500">Categoria</span><select value={artistCategory} onChange={(event) => { setArtistCategory(event.target.value); if (event.target.value !== "Música") setMusicGenres([]); }} className="h-12 w-full rounded border border-zinc-800 bg-black px-4 outline-none focus:border-red-800"><option value="">Escolher categoria</option>{artistCategories.map((value) => <option key={value}>{value}</option>)}</select></label>{artistCategory === "Outro" && <Field label="Especificar categoria" value={artistCategoryOther} onChange={setArtistCategoryOther} />}{artistCategory === "Música" && <GenreMultiSelect values={musicGenres} onChange={setMusicGenres} />}</>}
        {accountType !== "community" && <label className="sm:col-span-2"><span className="mb-2 flex justify-between gap-3 text-xs font-bold text-zinc-500"><span>Descrição</span><span>{description.length}/{maxProfileDescriptionLength}</span></span><textarea value={description} maxLength={maxProfileDescriptionLength} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder={accountType === "artist" ? "Apresenta o projeto, influências e percurso." : accountType === "organizer" ? "Fala sobre o projeto, espaço ou eventos que organizas." : "Apresenta o espaço e a sua atividade."} className="w-full resize-y rounded border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-800" /></label>}
        <PreferencePicker label="Cidades" values={cities} selected={preferredCities} onToggle={(value) => setPreferredCities((current) => toggle(current, value))} />
        <PreferencePicker label="Categorias" values={categories} selected={preferredCategories} onToggle={(value) => setPreferredCategories((current) => toggle(current, value))} />
      </div>
      {message && <p className="mt-4 text-sm text-zinc-400" role="status">{message}</p>}
      <div className="mt-5 flex gap-3"><LoadingButton type="button" onClick={saveProfile} loading={saving} loadingText="A guardar...">Guardar</LoadingButton><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button></div>
    </section>}

    <div className="grid gap-x-10 gap-y-8 py-8 lg:grid-cols-2">
      <ProfileSection title="A minha atividade" items={activityItems} />
      <ProfileSection title="A minha conta" items={[{ label: "Dados e preferências", description: "Nome, localização e categorias", icon: "settings", onClick: () => setEditing(true) }, { label: "Aparência", description: `Tema atual: ${themeLabel(preferredTheme)}`, icon: "sun", onClick: () => setAppearanceOpen(true) }, { label: signingOut ? "A terminar sessão..." : "Terminar sessão", icon: "logout", tone: "danger", onClick: signOut }]} />
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
