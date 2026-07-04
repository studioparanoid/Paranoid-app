"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

export function RegisterClient() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister() {
    setMessage("");

    if (!displayName || !email || !password) {
      setMessage("Preenche nome, email e palavra-passe.");
      return;
    }

    if (password.length < 6) {
      setMessage("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao criar conta. Verifica o email ou tenta outra vez.");
      return;
    }

    if (data.user && !data.session) {
      setMessage("Conta criada. Confirma o email antes de entrar.");
      return;
    }

    router.push("/perfil");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Nome público
        </label>

        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Ex: Damien"
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
          placeholder="tu@email.pt"
          className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Palavra-passe
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
        />
      </div>

      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
      >
        {loading ? "A criar..." : "Criar conta"}
      </button>

      {message && (
        <p className="text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}

      <div className="border-t border-zinc-800 pt-5">
        <p className="text-center text-sm text-zinc-500">
          Já tens conta?
        </p>

        <Link
          href="/login"
          className="mt-3 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
        >
          Entrar
        </Link>
      </div>
    </div>
  );
}