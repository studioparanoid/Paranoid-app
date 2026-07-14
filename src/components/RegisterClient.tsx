"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { supabase } from "@/lib/supabase/public";

type AccountType = "community" | "artist" | "organizer" | "venue";

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
  "Outra",
];

function normalizeExternalUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;
  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function accountTypeLabel(type: AccountType) {
  if (type === "artist") return "Artista";
  if (type === "organizer") return "Organizador";
  if (type === "venue") return "Espaço";
  return "Comunidade";
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
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("community");
  const [artistName, setArtistName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("Pombal");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    setCreating(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/perfil`
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
        },
      },
    });

    setCreating(false);

    if (error) {
      setMessage(`Erro ao criar conta: ${error.message}`);
      return;
    }

    if (data.session) {
      setMessage(
        accountType === "community"
          ? "Conta criada. A entrar..."
          : `Conta criada como ${accountTypeLabel(accountType)}. O perfil fica pendente até aprovação da Paranoid.`
      );
      router.push("/perfil");
      return;
    }

    setMessage(
      accountType === "community"
        ? "Conta criada. Confirma o email para entrares."
        : `Conta criada como ${accountTypeLabel(accountType)}. Confirma o email. O perfil fica pendente até aprovação da Paranoid.`
    );
  }

  return (
    <AuthFormCard eyebrow="Registo" title="Criar conta">
      <form onSubmit={createAccount} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
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

          <label htmlFor="register-city">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade base
            </span>
            <select
              id="register-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClassName}
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

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
