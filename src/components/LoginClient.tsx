"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

export function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setMessage("");

    if (!email || !password) {
      setMessage("Mete email e palavra-passe.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(`Erro ao entrar: ${error.message}`);
      return;
    }

    router.push("/perfil");
    router.refresh();
  }

  async function handlePasswordReset() {
    setMessage("");

    if (!email) {
      setMessage("Mete o teu email para receberes o link de recuperação.");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setMessage(`Erro ao enviar recuperação: ${error.message}`);
      return;
    }

    setMessage("Link de recuperação enviado para o email.");
  }

  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Conta
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            Login.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Entra com o email usado na Paranoid. Depois podes gerir guardados,
            preferências e submissões.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@email.com"
              autoComplete="email"
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
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleLogin();
                }
              }}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={loading}
            className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300 disabled:opacity-50"
          >
            Recuperar palavra-passe
          </button>

          {message && (
            <p className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
            <p className="text-sm leading-relaxed text-zinc-500">
              Ainda não tens conta?
            </p>

            <Link
              href="/registar"
              className="mt-4 block rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-400"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}