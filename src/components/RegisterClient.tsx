"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { EmailOtpConfirmation, pendingSignupEmailKey } from "@/components/auth/EmailOtpConfirmation";
import { CityCombobox, isKnownPortugueseMunicipality } from "@/components/profile/CityCombobox";
import { GenreMultiSelect } from "@/components/profile/GenreMultiSelect";
import { ProfileImageField } from "@/components/profile/ProfileImageField";
import { uploadProfileImage } from "@/lib/profileImages";
import { artistCategories, maxProfileDescriptionLength, organizerTypes } from "@/lib/profileOptions";
import { supabase } from "@/lib/supabase/public";

type AccountType = "community" | "artist" | "organizer" | "venue";

function normalizeExternalUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;
  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

const inputClassName =
  "h-12 w-full rounded border border-zinc-800 bg-black px-4 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800";

export function RegisterClient() {
  const router = useRouter();
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const entityNameRef = useRef<HTMLInputElement>(null);

  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("community");
  const [artistName, setArtistName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("Pombal");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [description, setDescription] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [organizerType, setOrganizerType] = useState("");
  const [organizerTypeOther, setOrganizerTypeOther] = useState("");
  const [artistCategory, setArtistCategory] = useState("");
  const [artistCategoryOther, setArtistCategoryOther] = useState("");
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pendingEmail = window.sessionStorage.getItem(pendingSignupEmailKey);
      if (pendingEmail) {
        setEmail(pendingEmail);
        setAwaitingEmail(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function completeProfileAndContinue() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        let avatarUrl = "";
        if (profileImage) avatarUrl = await uploadProfileImage(user.id, profileImage);
        await supabase.rpc("update_my_extended_profile", {
          p_avatar_url: avatarUrl || null,
          p_city: city || null,
          p_description: accountType === "community" ? null : description.trim() || null,
          p_organizer_type: accountType === "organizer" ? organizerType || null : null,
          p_organizer_type_other: accountType === "organizer" && organizerType === "Outro" ? organizerTypeOther.trim() || null : null,
          p_artist_category: accountType === "artist" ? artistCategory || null : null,
          p_artist_category_other: accountType === "artist" && artistCategory === "Outro" ? artistCategoryOther.trim() || null : null,
          p_music_genres: accountType === "artist" && artistCategory === "Música" ? musicGenres : [],
        });
      } catch {
        // The remaining optional details can be completed safely in the profile.
      }
    }
    router.replace("/perfil?onboarding=1");
    router.refresh();
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Mete o teu nome ou nome público.");
      displayNameRef.current?.focus();
      return;
    }

    if (!email.trim()) {
      setMessage("Mete o email.");
      emailRef.current?.focus();
      return;
    }

    if (password.length < 6) {
      setMessage("A palavra-passe tem de ter pelo menos 6 caracteres.");
      passwordRef.current?.focus();
      return;
    }

    const missingEntityName =
      (accountType === "artist" && !artistName.trim()) ||
      (accountType === "organizer" && !organizerName.trim()) ||
      (accountType === "venue" && !venueName.trim());

    if (missingEntityName) {
      setMessage(
        accountType === "artist"
          ? "Mete o nome artístico ou projeto."
          : accountType === "organizer"
            ? "Mete o nome do organizador ou coletivo."
            : "Mete o nome do espaço."
      );
      entityNameRef.current?.focus();
      return;
    }

    if (!isKnownPortugueseMunicipality(city)) {
      setMessage("Escolhe uma cidade/localidade da lista.");
      return;
    }

    if (description.length > maxProfileDescriptionLength) {
      setMessage(`A descrição não pode ultrapassar ${maxProfileDescriptionLength} caracteres.`);
      return;
    }

    setCreating(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/perfil?onboarding=1")}`
            : undefined,
        data: {
          display_name: displayName.trim(),
          account_type: accountType,
          artist_name: accountType === "artist" ? artistName.trim() : null,
          organizer_name:
            accountType === "organizer" ? organizerName.trim() : null,
          venue_name: accountType === "venue" ? venueName.trim() : null,
          city,
          instagram_url: normalizeExternalUrl(instagramUrl),
          description: accountType === "community" ? null : description.trim() || null,
          organizer_type: accountType === "organizer" ? organizerType || null : null,
          organizer_type_other: accountType === "organizer" && organizerType === "Outro" ? organizerTypeOther.trim() || null : null,
          artist_category: accountType === "artist" ? artistCategory || null : null,
          artist_category_other: accountType === "artist" && artistCategory === "Outro" ? artistCategoryOther.trim() || null : null,
          music_genres: accountType === "artist" && artistCategory === "Música" ? musicGenres : [],
        },
      },
    });

    if (error) {
      setCreating(false);
      setMessage("Não foi possível criar a conta. Confirma os dados e tenta novamente.");
      return;
    }

    setCreating(false);

    if (data.session) {
      const profileResponse = await fetch("/api/auth/ensure-profile", { method: "POST" });
      if (!profileResponse.ok) {
        setMessage("Conta criada, mas não foi possível preparar o perfil. Tenta entrar novamente.");
        return;
      }
      await completeProfileAndContinue();
      return;
    }

    setMessage("Verifica o teu email para continuar.");
    setAwaitingEmail(true);
  }

  if (awaitingEmail) {
    return <AuthFormCard eyebrow="Registo" title="Confirma o teu email">
      <EmailOtpConfirmation
        email={email.trim().toLowerCase()}
        onChangeEmail={() => setAwaitingEmail(false)}
        onVerified={completeProfileAndContinue}
      />
    </AuthFormCard>;
  }

  return (
    <AuthFormCard eyebrow="Registo" title="Criar conta">
      <form onSubmit={createAccount} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <ProfileImageField imageUrl="" onFile={setProfileImage} onRemove={() => setProfileImage(null)} disabled={creating} />
          <label className="sm:col-span-2" htmlFor="register-display-name">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Nome público
            </span>
            <input
              ref={displayNameRef}
              id="register-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              required
              placeholder="O teu nome"
              className={inputClassName}
            />
          </label>

          <label htmlFor="register-email">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Email
            </span>
            <input
              ref={emailRef}
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              placeholder="email@exemplo.pt"
              className={inputClassName}
            />
          </label>

          <label htmlFor="register-password">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Palavra-passe
            </span>
            <input
              ref={passwordRef}
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="Mínimo 6 caracteres"
              className={inputClassName}
            />
          </label>

          <label htmlFor="register-account-type">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Tipo de perfil
            </span>
            <select
              id="register-account-type"
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as AccountType)
              }
              className={inputClassName}
            >
              <option value="community">Comunidade</option>
              <option value="artist">Artista</option>
              <option value="organizer">Organizador</option>
              <option value="venue">Espaço</option>
            </select>
          </label>

          <CityCombobox label="Cidade base" value={city} onChange={setCity} required />

          {accountType !== "community" && (
            <label className="sm:col-span-2" htmlFor="register-entity-name">
              <span className="mb-2 block text-sm font-bold text-zinc-300">
                {accountType === "artist"
                  ? "Nome artístico / projeto"
                  : accountType === "organizer"
                    ? "Nome do organizador / coletivo"
                    : "Nome do espaço"}
              </span>
              <input
                ref={entityNameRef}
                id="register-entity-name"
                value={
                  accountType === "artist"
                    ? artistName
                    : accountType === "organizer"
                      ? organizerName
                      : venueName
                }
                onChange={(event) => {
                  if (accountType === "artist") setArtistName(event.target.value);
                  if (accountType === "organizer") setOrganizerName(event.target.value);
                  if (accountType === "venue") setVenueName(event.target.value);
                }}
                required
                placeholder="Nome público na rede"
                className={inputClassName}
              />
            </label>
          )}

          {accountType === "organizer" && <>
            <label htmlFor="register-organizer-type"><span className="mb-2 block text-sm font-bold text-zinc-300">Tipo</span><select id="register-organizer-type" value={organizerType} onChange={(event) => setOrganizerType(event.target.value)} className={inputClassName}><option value="">Escolher tipo</option>{organizerTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
            {organizerType === "Outro" && <label htmlFor="register-organizer-type-other"><span className="mb-2 block text-sm font-bold text-zinc-300">Especificar tipo</span><input id="register-organizer-type-other" value={organizerTypeOther} onChange={(event) => setOrganizerTypeOther(event.target.value.slice(0, 60))} className={inputClassName} /></label>}
          </>}

          {accountType === "artist" && <>
            <label htmlFor="register-artist-category"><span className="mb-2 block text-sm font-bold text-zinc-300">Categoria</span><select id="register-artist-category" value={artistCategory} onChange={(event) => { setArtistCategory(event.target.value); if (event.target.value !== "Música") setMusicGenres([]); }} className={inputClassName}><option value="">Escolher categoria</option>{artistCategories.map((value) => <option key={value}>{value}</option>)}</select></label>
            {artistCategory === "Outro" && <label htmlFor="register-artist-category-other"><span className="mb-2 block text-sm font-bold text-zinc-300">Especificar categoria</span><input id="register-artist-category-other" value={artistCategoryOther} onChange={(event) => setArtistCategoryOther(event.target.value.slice(0, 60))} className={inputClassName} /></label>}
            {artistCategory === "Música" && <GenreMultiSelect values={musicGenres} onChange={setMusicGenres} />}
          </>}

          {accountType !== "community" && <label className="sm:col-span-2" htmlFor="register-description"><span className="mb-2 flex justify-between gap-3 text-sm font-bold text-zinc-300"><span>Descrição</span><span className="text-xs text-zinc-600">{description.length}/{maxProfileDescriptionLength}</span></span><textarea id="register-description" value={description} maxLength={maxProfileDescriptionLength} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder={accountType === "artist" ? "Apresenta o projeto, influências e percurso." : accountType === "organizer" ? "Fala sobre o projeto, espaço ou eventos que organizas." : "Apresenta o espaço e a sua atividade."} className={`${inputClassName} h-auto min-h-32 py-3`} /></label>}

          <label className="sm:col-span-2" htmlFor="register-instagram">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Instagram <span className="font-normal text-zinc-600">(opcional)</span>
            </span>
            <input
              id="register-instagram"
              value={instagramUrl}
              onChange={(event) => setInstagramUrl(event.target.value)}
              autoComplete="url"
              inputMode="url"
              placeholder="instagram.com/..."
              className={inputClassName}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="pressable focus-ring mt-7 w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:cursor-wait disabled:opacity-50"
        >
          {creating ? "A criar conta..." : "Criar conta"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Já tens conta?{" "}
          <Link href="/login" className="font-black text-[#f2f1ec] underline underline-offset-4">
            Entrar
          </Link>
        </p>

        {message && (
          <p
            id="register-message"
            role="status"
            aria-live="polite"
            className="mt-5 rounded border border-zinc-800 bg-black px-4 py-3 text-center text-sm font-bold text-zinc-300"
          >
            {message}
          </p>
        )}
      </form>
    </AuthFormCard>
  );
}
