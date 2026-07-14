"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { supabase } from "@/lib/supabase/public";

const inputClassName =
  "h-12 w-full rounded border border-zinc-800 bg-black px-4 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800";

export function LoginClient() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim()) {
      setMessage("Mete o email.");
      emailRef.current?.focus();
      return;
    }

    if (!password) {
      setMessage("Mete a palavra-passe.");
      passwordRef.current?.focus();
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

    if (!email.trim()) {
      setMessage("Mete o teu email para receberes o link de recuperação.");
      emailRef.current?.focus();
      return;
    }

    setLoading(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setLoading(false);

    setMessage(
      error
        ? `Erro ao enviar recuperação: ${error.message}`
        : "Link de recuperação enviado para o email."
    );
  }

  return (
    <AuthFormCard eyebrow="Login" title="Entrar">
      <form onSubmit={handleLogin} noValidate>
        <div className="space-y-5">
          <label htmlFor="login-email">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Email
            </span>
            <input
              ref={emailRef}
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              placeholder="nome@email.com"
              className={inputClassName}
            />
          </label>

          <label htmlFor="login-password">
            <span className="mb-2 block text-sm font-bold text-zinc-300">
              Palavra-passe
            </span>
            <input
              ref={passwordRef}
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="A tua palavra-passe"
              className={inputClassName}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="pressable focus-ring mt-7 w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:cursor-wait disabled:opacity-50"
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={loading}
          className="pressable focus-ring mt-3 w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300 disabled:opacity-50"
        >
          Recuperar palavra-passe
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Ainda não tens conta?{" "}
          <Link href="/registar" className="font-black text-[#f2f1ec] underline underline-offset-4">
            Criar conta
          </Link>
        </p>

        {message && (
          <p
            id="login-message"
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
