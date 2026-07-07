"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function accountTypeLabel(type: AccountType) {
  if (type === "artist") {
    return "Artista";
  }

  if (type === "organizer") {
    return "Organizador";
  }

  if (type === "venue") {
    return "Espaço";
  }

  return "Comunidade";
}

export function RegisterClient() {
  const router = useRouter();

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

  async function createAccount() {
    setMessage("");

    if (!displayName.trim()) {
      setMessage("Mete o teu nome ou nome público.");
      return;
    }

    if (!email.trim()) {
      setMessage("Mete o email.");
      return;
    }

    if (password.length < 6) {
      setMessage("A password tem de ter pelo menos 6 caracteres.");
      return;
    }

    if (accountType === "artist" && !artistName.trim()) {
      setMessage("Mete o nome artístico/projeto.");
      return;
    }

    if (accountType === "organizer" && !organizerName.trim()) {
      setMessage("Mete o nome do organizador/coletivo.");
      return;
    }

    if (accountType === "venue" && !venueName.trim()) {
      setMessage("Mete o nome do espaço.");
      return;
    }

    setCreating(true);

    const cleanDisplayName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanInstagramUrl = normalizeExternalUrl(instagramUrl);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/perfil`
            : undefined,
        data: {
          display_name: cleanDisplayName,
          account_type: accountType,
          artist_name: accountType === "artist" ? artistName.trim() : null,
          organizer_name:
            accountType === "organizer" ? organizerName.trim() : null,
          venue_name: accountType === "venue" ? venueName.trim() : null,
          city,
          instagram_url: cleanInstagramUrl,
        },
      },
    });

    setCreating(false);

    if (error) {
      setMessage(`Erro ao criar conta: ${error.message}`);
      return;
    }

    if (data.session) {
      if (accountType === "community") {
        setMessage("Conta criada. A entrar...");
      } else {
        setMessage(
          `Conta criada como ${accountTypeLabel(
            accountType
          )}. O perfil fica pendente até aprovação da Paranoid.`
        );
      }

      router.push("/perfil");
      return;
    }

    if (accountType === "community") {
      setMessage("Conta criada. Confirma o email para entrares.");
      return;
    }

    setMessage(
      `Conta criada como ${accountTypeLabel(
        accountType
      )}. Confirma o email. O perfil fica pendente até aprovação da Paranoid.`
    );
  }

  return (
    <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:sticky lg:top-28 lg:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-red-700">
          Entrar na rede
        </p>

        <h2 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
          Não és só utilizador.
        </h2>

        <p className="mt-5 text-base leading-relaxed text-zinc-400">
          Cria o teu perfil como comunidade, artista, organizador ou espaço.
          A Paranoid usa isto para perceber quem está na rede cultural.
        </p>

        <div className="mt-8 space-y-3 text-sm text-zinc-500">
          <p>
            <span className="font-black text-[#f2f1ec]">Comunidade</span> —
            guarda eventos, segue artistas, reserva bilhetes.
          </p>

          <p>
            <span className="font-black text-[#f2f1ec]">Artista</span> — banda,
            DJ, performer, coletivo criativo.
          </p>

          <p>
            <span className="font-black text-[#f2f1ec]">Organizador</span> —
            promotor, associação, coletivo, produtora.
          </p>

          <p>
            <span className="font-black text-[#f2f1ec]">Espaço</span> — sala,
            bar, galeria, cineclube, auditório.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
        >
          Já tenho conta
        </Link>
      </aside>

      <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-red-700">
          Registo
        </p>

        <h1 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
          Criar perfil.
        </h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome público
            </label>

            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ex: Damien Gonçalves"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Tipo de perfil
            </label>

            <select
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as AccountType)
              }
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              <option value="community">Comunidade</option>
              <option value="artist">Artista</option>
              <option value="organizer">Organizador</option>
              <option value="venue">Espaço</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade base
            </label>

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {accountType === "artist" && (
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Nome artístico / projeto
              </label>

              <input
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                placeholder="Ex: banda, DJ, performer, coletivo..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>
          )}

          {accountType === "organizer" && (
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Nome do organizador / coletivo
              </label>

              <input
                value={organizerName}
                onChange={(event) => setOrganizerName(event.target.value)}
                placeholder="Ex: associação, produtora, coletivo, promotor..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>
          )}

          {accountType === "venue" && (
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Nome do espaço
              </label>

              <input
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                placeholder="Ex: bar, sala, galeria, auditório..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>
          )}

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Instagram
            </label>

            <input
              value={instagramUrl}
              onChange={(event) => setInstagramUrl(event.target.value)}
              placeholder="instagram.com/..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@exemplo.pt"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={createAccount}
          disabled={creating}
          className="mt-8 w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {creating
            ? "A criar conta..."
            : `Criar conta como ${accountTypeLabel(accountType)}`}
        </button>

        {message && (
          <p className="mt-5 text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </section>
    </section>
  );
}