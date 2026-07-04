"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

export function RegisterClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);

  async function handleRegister() {
    setMessage("");

    if (!email || !password) {
      setMessage("Mete email e palavra-passe.");
      return;
    }

    if (password.length < 6) {
      setMessage("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/perfil`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setLoading(false);
      setMessage(`Erro ao criar conta: ${error.message}`);
      return;
    }

    if (data.user?.id) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        role: "user",
        preferred_cities: [],
        preferred_categories: [],
      });
    }

    setLoading(false);
    setCreated(true);

    if (data.session) {
      setMessage("Conta criada. A entrar...");
      router.push("/perfil");
      router.refresh();
      return;
    }

    setMessage(
      "Conta criada. Confirma o email se receberes um link de ativação."
    );
  }

  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Registo
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            Nova conta.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Começa simples. Depois no perfil escolhes cidades, categorias e
            guardas eventos.
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
              disabled={created}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
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
              autoComplete="new-password"
              disabled={created}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleRegister();
                }
              }}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
            />
          </div>

          {!created && (
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {loading ? "A criar..." : "Criar conta"}
            </button>
          )}

          {message && (
            <p className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
            <p className="text-sm leading-relaxed text-zinc-500">
              Já tens conta?
            </p>

            <Link
              href="/login"
              className="mt-4 block rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-400"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}