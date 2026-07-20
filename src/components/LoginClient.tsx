"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { EmailOtpConfirmation, pendingSignupEmailKey } from "@/components/auth/EmailOtpConfirmation";
import { supabase } from "@/lib/supabase/public";
import { safeInternalPath } from "@/lib/auth/redirects";

const inputClassName =
  "focus-ring h-12 w-full rounded-xl border border-input-border bg-input px-4 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent";

export function LoginClient() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("error") === "callback") {
        setMessage("A ligação de confirmação expirou ou já foi utilizada. Tenta entrar novamente.");
      }
      const pendingEmail = window.sessionStorage.getItem(pendingSignupEmailKey);
      if (pendingEmail) {
        setEmail(pendingEmail);
        setPendingConfirmation(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
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
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      if (error.code === "email_not_confirmed") {
        setEmail(normalizedEmail);
        setPendingConfirmation(true);
        return;
      }
      setMessage(
        error.code === "invalid_credentials"
            ? "Email ou palavra-passe incorretos."
            : "Não foi possível entrar. Confirma a ligação e tenta novamente."
      );
      return;
    }

    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel === "aal1" && assurance.nextLevel === "aal2") {
      router.push(`/auth/mfa?next=${encodeURIComponent(next)}`);
    } else {
      router.push(next);
    }
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });
    setLoading(false);

    setMessage(error ? "Não foi possível enviar a recuperação agora." : "Se existir uma conta com este email, enviámos uma ligação de recuperação.");
  }

  if (pendingConfirmation) {
    return (
      <AuthFormCard eyebrow="Login" title="Confirma o teu email">
        <EmailOtpConfirmation
          email={email.trim().toLowerCase()}
          onChangeEmail={() => setPendingConfirmation(false)}
          onVerified={async () => {
            router.replace("/perfil?onboarding=1");
            router.refresh();
          }}
        />
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard eyebrow="Login" title="Entrar">
      <form onSubmit={handleLogin} noValidate>
        <div className="space-y-5">
          <label htmlFor="login-email">
            <span className="mb-2 block text-sm font-bold text-foreground-secondary">
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
            <span className="mb-2 block text-sm font-bold text-foreground-secondary">
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
          className="pressable focus-ring mt-7 w-full rounded-full bg-foreground px-5 py-4 text-sm font-black text-background disabled:cursor-wait disabled:opacity-50"
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={loading}
          className="pressable focus-ring mt-3 w-full rounded-full border border-border-strong px-5 py-4 text-sm font-bold text-foreground-secondary disabled:opacity-50"
        >
          Recuperar palavra-passe
        </button>

        <p className="mt-4 text-center text-sm text-foreground-muted">
          Ainda não tens conta?{" "}
          <Link href="/registar" className="font-black text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </p>

        {message && (
          <p
            id="login-message"
            role="status"
            aria-live="polite"
            className="mt-5 rounded-xl border border-border bg-background-subtle px-4 py-3 text-center text-sm font-bold text-foreground-secondary"
          >
            {message}
          </p>
        )}
      </form>
    </AuthFormCard>
  );
}
