"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { AlbumStackedPreview } from "@/components/albums/AlbumStackedPreview";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { SettingsList, type SettingsListItem } from "@/components/SettingsList";
import { StatusBadge } from "@/components/StatusBadge";
import { AppearanceSettings } from "@/components/theme/AppearanceSettings";
import { themeLabel } from "@/components/theme/ThemeSelector";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button, LinkButton, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { listCoverPhotosForAlbums, listMyAlbums, type PhotoAlbum } from "@/lib/albums";
import { CityCombobox, isKnownPortugueseMunicipality } from "@/components/profile/CityCombobox";
import { CityMultiSelect } from "@/components/profile/CityMultiSelect";
import { GenreMultiSelect } from "@/components/profile/GenreMultiSelect";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { profilePurchaseNavigation } from "@/config/navigation";
import { fallbackEventCategories } from "@/lib/eventFilters";
import { removeProfileImage, uploadProfileImage } from "@/lib/profileImages";
import { artistCategories, maxProfileDescriptionLength, organizerTypes } from "@/lib/profileOptions";
import { supabase } from "@/lib/supabase/public";
import { MfaSecurityPanel } from "@/components/auth/MfaSecurityPanel";

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

type SavedPreviewItem = { id: string; slug: string; title: string; imageUrl: string | null };

const categories = fallbackEventCategories;

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"guardados" | "atividade" | "definicoes">("atividade");
  const [savedCount, setSavedCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [savedPreview, setSavedPreview] = useState<SavedPreviewItem[]>([]);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<"profile" | null>(null);
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
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [myAlbums, setMyAlbums] = useState<PhotoAlbum[]>([]);
  const [myAlbumCovers, setMyAlbumCovers] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const { preferredTheme } = useTheme();

  async function loadProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [profileResponse, adminResponse, savedCountResponse, followingCountResponse, ticketCountResponse, savedPreviewResponse, pendingInviteResponse] = await Promise.all([
      supabase.from("profiles").select("id,display_name,account_type,account_status,artist_name,organizer_name,venue_name,city,instagram_url,entity_id,entity_slug,preferred_cities,preferred_categories,avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("saved_events").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("ticket_reservations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "reserved"),
      supabase.from("saved_events").select("event_id, events(id,slug,title,image_url)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(9),
      supabase.from("organizer_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "invited"),
    ]);
    setPendingInviteCount(pendingInviteResponse.count || 0);
    const loadedAlbums = await listMyAlbums();
    setMyAlbums(loadedAlbums);
    setMyAlbumCovers(await listCoverPhotosForAlbums(loadedAlbums.map((album) => album.id)));
    const nextProfile = profileResponse.data as ProfileRow | null;
    setUserId(user.id);
    setEmail(user.email || "");
    setIsAdmin(Boolean(adminResponse.data));
    setSavedCount(savedCountResponse.count || 0);
    setFollowingCount(followingCountResponse.count || 0);
    setTicketCount(ticketCountResponse.count || 0);
    const previewRows = (savedPreviewResponse.data || []) as unknown as Array<{ event_id: string; events: { id: string; slug: string; title: string; image_url: string | null } | null }>;
    setSavedPreview(previewRows.filter((row) => row.events).map((row) => ({ id: row.events!.id, slug: row.events!.slug, title: row.events!.title, imageUrl: row.events!.image_url })));
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
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("onboarding") === "1") {
        setOnboardingStep("profile");
        setEditing(true);
        setActiveTab("definicoes");
      }
      void loadProfile();
    }, 0);
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
    if (onboardingStep === "profile") {
      setOnboardingStep(null);
      setEditing(false);
      router.replace("/perfil", { scroll: false });
      toast({ message: "Conta configurada.", tone: "success" });
    } else {
      setEditing(false);
    }
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
  if (!userId) return <div className="mx-auto max-w-lg py-16 text-center"><h1 className="text-4xl font-black">Entra na tua conta.</h1><p className="mt-3 text-sm text-foreground-muted">Guarda eventos, segue a rede e consulta os teus bilhetes.</p><div className="mt-6 flex justify-center gap-3"><LinkButton href="/login">Entrar</LinkButton><LinkButton href="/registar" variant="secondary">Criar conta</LinkButton></div></div>;

  const accountType = profile?.account_type || "community";
  const approved = profile?.account_status === "approved";
  const entityPath = publicPath(accountType, profile?.entity_slug || null);
  const title = entityName || displayName || email.split("@")[0] || "Perfil";
  const purchaseItems: SettingsListItem[] = profilePurchaseNavigation
    .filter((item) => item.href !== "/bilhetes")
    .map((item) => ({ ...item, description: "Loja e compras" }));
  const creatorItems: SettingsListItem[] = [];
  if (approved && accountType === "organizer") {
    creatorItems.push(
      { href: "/submeter", label: "Submeter evento", description: "Publicar é gratuito", icon: "plus" },
      { href: "/organizador", label: "Área do organizador", description: "Eventos, destaques, loja e perfil", icon: "organizer" },
      { href: "/organizador/espacos", label: "Os meus espaços", description: "Criar e gerir os espaços do organizador", icon: "venue" },
    );
  }
  if (approved && accountType === "artist") {
    creatorItems.push({ href: "/artista", label: "Área do artista", description: "Eventos, loja e perfil", icon: "artist" });
  }
  if (approved && (accountType === "organizer" || accountType === "artist")) {
    creatorItems.push({ href: "/reservas", label: "Pedidos de reserva", description: "Conversas com organizadores e artistas", icon: "calendar" });
  }
  if (approved && entityPath) creatorItems.push({ href: entityPath, label: "Ver perfil público", icon: accountType === "artist" ? "artist" : accountType === "venue" ? "venue" : "organizer" });
  if (!approved) {
    creatorItems.push({ href: "/reivindicar", label: "Reivindicar perfil", description: "Junta-te à rede como artista, organizador ou espaço", icon: "spark" });
  }
  if (pendingInviteCount > 0) {
    creatorItems.push({ href: "/convites", label: "Convites pendentes", description: `${pendingInviteCount} ${pendingInviteCount === 1 ? "convite" : "convites"} por aceitar`, icon: "organizer" });
  }

  return <div>
    <AppearanceSettings open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    {onboardingStep && <div className="mb-6 border-b border-[var(--border)] pb-4" aria-label="Progresso da configuração">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-accent">Configurar conta</p>
      <p className="mt-2 text-sm font-bold text-[var(--foreground)]">Completa o perfil</p>
    </div>}
    <header className="pb-5">
      <div className="flex items-center gap-6 sm:gap-10">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-accent/30 bg-accent/12 text-2xl font-black text-accent sm:h-24 sm:w-24">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${title}`} className="h-full w-full object-cover" /> : title.charAt(0).toUpperCase()}</div>
        <div className="flex flex-1 justify-around sm:justify-start sm:gap-10">
          <StatBlock value={savedCount} label="Guardados" onClick={() => setActiveTab("guardados")} active={activeTab === "guardados"} />
          <StatBlock value={followingCount} label="A seguir" href="/descobrir" />
          <StatBlock value={ticketCount} label="Bilhetes" href="/bilhetes" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <StatusBadge label={profile?.account_status === "pending" ? "Pendente" : accountTypeLabel(accountType)} tone={profile?.account_status === "pending" ? "warning" : "neutral"} />
        </div>
        {accountType !== "community" && description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground-secondary">{description}</p>}
        {accountType === "community" && city && <p className="mt-1 text-sm text-foreground-muted">{city}</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => { setEditing(true); setActiveTab("definicoes"); }} className={approved && (accountType === "organizer" || accountType === "artist") ? "" : "w-full"}>Editar perfil</Button>
        {approved && (accountType === "organizer" || accountType === "artist") && (
          <LinkButton href={accountType === "organizer" ? "/organizador" : "/artista"} size="sm" className="flex-1">Criar e gerir</LinkButton>
        )}
      </div>
    </header>

    {editing && <section className="slide-up border-b border-border py-7">
      <SectionHeader title="Editar perfil" />
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileImageField imageUrl={removeAvatar ? "" : avatarUrl} onFile={(file) => { setAvatarFile(file); setRemoveAvatar(false); }} onRemove={() => { setAvatarFile(null); setRemoveAvatar(true); }} disabled={saving} />
        <Field label={accountType === "community" ? "Nome" : "Nome público"} value={accountType === "community" ? displayName : entityName} onChange={accountType === "community" ? setDisplayName : setEntityName} />
        <CityCombobox label="Cidade/localidade" value={city} onChange={setCity} />
        <Field label="Instagram" value={instagram} onChange={setInstagram} />
        {accountType === "organizer" && <><label><span className="mb-2 block text-xs font-bold text-foreground-muted">Tipo</span><select value={organizerType} onChange={(event) => setOrganizerType(event.target.value)} className="focus-ring h-12 w-full rounded-md border border-input-border bg-input px-4 text-foreground outline-none"><option value="">Escolher tipo</option>{organizerTypes.map((value) => <option key={value}>{value}</option>)}</select></label>{organizerType === "Outro" && <Field label="Especificar tipo" value={organizerTypeOther} onChange={setOrganizerTypeOther} />}</>}
        {accountType === "artist" && <><label><span className="mb-2 block text-xs font-bold text-foreground-muted">Categoria</span><select value={artistCategory} onChange={(event) => { setArtistCategory(event.target.value); if (event.target.value !== "Música") setMusicGenres([]); }} className="focus-ring h-12 w-full rounded-md border border-input-border bg-input px-4 text-foreground outline-none"><option value="">Escolher categoria</option>{artistCategories.map((value) => <option key={value}>{value}</option>)}</select></label>{artistCategory === "Outro" && <Field label="Especificar categoria" value={artistCategoryOther} onChange={setArtistCategoryOther} />}{artistCategory === "Música" && <GenreMultiSelect values={musicGenres} onChange={setMusicGenres} />}</>}
        {accountType !== "community" && <label className="sm:col-span-2"><span className="mb-2 flex justify-between gap-3 text-xs font-bold text-foreground-muted"><span>Descrição</span><span>{description.length}/{maxProfileDescriptionLength}</span></span><textarea value={description} maxLength={maxProfileDescriptionLength} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder={accountType === "artist" ? "Apresenta o projeto, influências e percurso." : accountType === "organizer" ? "Fala sobre o projeto, espaço ou eventos que organizas." : "Apresenta o espaço e a sua atividade."} className="focus-ring w-full resize-y rounded-md border border-input-border bg-input px-4 py-3 text-foreground outline-none" /></label>}
        <CityMultiSelect label="Cidades" values={preferredCities} onChange={setPreferredCities} />
        <PreferencePicker label="Categorias" values={categories} selected={preferredCategories} onToggle={(value) => setPreferredCategories((current) => toggle(current, value))} />
      </div>
      {message && <p className="mt-4 text-sm text-foreground-secondary" role="status">{message}</p>}
      <div className="mt-5 flex gap-3"><LoadingButton type="button" onClick={saveProfile} loading={saving} loadingText="A guardar...">Guardar</LoadingButton><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button></div>
    </section>}

    {!editing && <ProfileTabs active={activeTab} onChange={setActiveTab} />}

    {!editing && activeTab === "guardados" && (
      <div className="content-transition py-6">
        {savedPreview.length === 0 ? (
          <div className="py-14 text-center">
            <AppIcon name="bookmark" className="mx-auto h-7 w-7 text-foreground-muted" />
            <p className="mt-3 text-sm font-bold text-foreground">Ainda não guardaste nada</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-foreground-muted">Os eventos que guardares na agenda aparecem aqui.</p>
            <LinkButton href="/agenda" variant="secondary" className="mt-5">Ver agenda</LinkButton>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-0.5">
              {savedPreview.map((item) => (
                <Link key={item.id} href={`/eventos/${item.slug}`} className="group focus-ring relative block aspect-square overflow-hidden bg-surface-secondary">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="grid h-full place-items-center px-2 text-center text-[10px] font-black uppercase tracking-wide text-foreground-muted">{item.title}</span>
                  )}
                </Link>
              ))}
            </div>
            {savedCount > savedPreview.length && <LinkButton href="/guardados" variant="ghost" className="mt-5 w-full">Ver todos os {savedCount} guardados</LinkButton>}
          </>
        )}
      </div>
    )}

    {!editing && activeTab === "atividade" && <div className="content-transition space-y-8 py-8">
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-accent">Fotografias</p>
            <h2 className="mt-1 text-xl font-black text-foreground">Álbuns</h2>
          </div>
          {myAlbums.length > 0 && (
            <Link href="/albuns/novo" className="focus-ring pressable inline-flex min-h-10 items-center gap-2 border border-border-strong px-3 text-xs font-black text-foreground hover:border-foreground-muted">
              <AppIcon name="plus" className="h-4 w-4" />
              Novo álbum
            </Link>
          )}
        </div>
        {myAlbums.length === 0 ? (
          <Link href="/albuns/novo" className="interactive focus-ring block rounded-lg border border-dashed border-border px-6 py-8 text-center hover:border-foreground-muted">
            <AppIcon name="camera" className="mx-auto h-6 w-6 text-foreground-muted" />
            <p className="mt-3 text-sm font-bold text-foreground">Mostra o que estás a criar.</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-foreground-muted">Cria um álbum e partilha fotos com quem te segue.</p>
            <span className="mt-4 inline-block rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-white">Criar álbum</span>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
            {myAlbums.map((album) => (
              <AlbumStackedPreview key={album.id} photos={myAlbumCovers[album.id] || []} title={album.title} href={`/albuns/${album.id}`} visibility={album.visibility} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        {creatorItems.length > 0 && <ProfileSection title="Criar e gerir" items={creatorItems} />}
        {approved && accountType === "organizer" && <ProfileSection title="Visibilidade e parcerias" items={[{ href: "/organizador/destaques", label: "Destaques e Frequency", icon: "visibility" }, { href: "/patrocinar", label: "Parcerias Paranoid", icon: "organizer" }]} />}
        {creatorItems.length === 0 && !(approved && accountType === "organizer") && <p className="text-sm text-foreground-muted">Sem atividade de gestão associada a esta conta.</p>}
      </div>
    </div>}

    {!editing && activeTab === "definicoes" && <div className="content-transition space-y-8 py-8">
      <MfaSecurityPanel />
      <ProfileSection title="A minha conta" items={[{ label: "Dados e preferências", description: "Nome, localização e categorias", icon: "settings", onClick: () => setEditing(true) }, { label: "Aparência", description: `Tema atual: ${themeLabel(preferredTheme)}`, icon: "sun", onClick: () => setAppearanceOpen(true) }, { label: signingOut ? "A terminar sessão..." : "Terminar sessão", icon: "logout", tone: "danger", onClick: signOut }]} />
      {purchaseItems.length > 0 && <ProfileSection title="Compras" items={purchaseItems} />}
      {isAdmin && <ProfileSection title="Administração" items={[{ href: "/admin", label: "Painel administrativo", description: "Conteúdo, utilizadores, comercial e loja", icon: "admin" }]} />}
    </div>}
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-xs font-bold text-foreground-muted">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring w-full rounded-md border border-input-border bg-input px-4 py-3 text-foreground outline-none" /></label>;
}

function PreferencePicker({ label, values, selected, onToggle }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-bold text-foreground-muted">{label}</legend><div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => onToggle(value)} aria-pressed={selected.includes(value)} className={`pressable focus-ring rounded-full border px-3 py-2 text-xs font-bold ${selected.includes(value) ? "border-foreground bg-foreground text-background" : "border-border text-foreground-muted hover:border-border-strong"}`}>{value}</button>)}</div></fieldset>;
}

function ProfileSection({ title, items }: { title: string; items: SettingsListItem[] }) {
  return <section><SectionHeader title={title} /><SettingsList items={items} /></section>;
}

type LocalTab = "guardados" | "atividade" | "definicoes";

function ProfileTabs({ active, onChange }: { active: LocalTab; onChange: (tab: LocalTab) => void }) {
  const itemClassName = (isActive: boolean) => `pressable focus-ring flex flex-1 items-center justify-center border-t-2 py-3 ${isActive ? "border-foreground text-foreground" : "border-transparent text-foreground-muted hover:text-foreground"}`;
  return (
    <nav aria-label="Secções do perfil" className="-mt-px flex border-t border-border">
      <button type="button" onClick={() => onChange("atividade")} aria-current={active === "atividade" ? "page" : undefined} aria-label="Atividade" title="Atividade" className={itemClassName(active === "atividade")}>
        <AppIcon name="spark" className="h-5 w-5" />
      </button>
      <Link href="/descobrir" aria-label="Seguir" title="Seguir" className={itemClassName(false)}>
        <AppIcon name="compass" className="h-5 w-5" />
      </Link>
      <Link href="/bilhetes" aria-label="Bilhetes" title="Bilhetes" className={itemClassName(false)}>
        <AppIcon name="ticket" className="h-5 w-5" />
      </Link>
      <button type="button" onClick={() => onChange("guardados")} aria-current={active === "guardados" ? "page" : undefined} aria-label="Guardados" title="Guardados" className={itemClassName(active === "guardados")}>
        <AppIcon name="bookmark" className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => onChange("definicoes")} aria-current={active === "definicoes" ? "page" : undefined} aria-label="Definições" title="Definições" className={itemClassName(active === "definicoes")}>
        <AppIcon name="settings" className="h-5 w-5" />
      </button>
    </nav>
  );
}

function StatBlock({ value, label, onClick, href, active }: { value: number; label: string; onClick?: () => void; href?: string; active?: boolean }) {
  const content = <><span className="block text-lg font-black leading-tight">{value}</span><span className={`block text-xs ${active ? "text-foreground" : "text-foreground-muted"}`}>{label}</span></>;
  const className = "pressable focus-ring rounded px-1 py-1 text-center";
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}
