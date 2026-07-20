"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/public";

export const pendingSignupEmailKey = "paranoid.pending-signup-email";

type EmailOtpConfirmationProps = {
  email: string;
  onChangeEmail: () => void;
  onVerified: () => Promise<void> | void;
};

const cooldownSeconds = 60;

export function EmailOtpConfirmation({ email, onChangeEmail, onVerified }: EmailOtpConfirmationProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [message, setMessage] = useState("Introduz o código que enviámos para o teu email.");

  useEffect(() => {
    window.sessionStorage.setItem(pendingSignupEmailKey, email);
    inputRef.current?.focus();
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6,8}$/.test(code)) {
      setMessage("Introduz o código completo, tal como veio no email.");
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setMessage("A confirmar...");
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    if (error || !data.session || !data.user) {
      setBusy(false);
      setMessage("O código é inválido ou expirou. Confirma os dígitos ou pede um novo código.");
      return;
    }

    const response = await fetch("/api/auth/ensure-profile", { method: "POST" });
    if (!response.ok) {
      setBusy(false);
      setMessage("O email foi confirmado, mas não foi possível preparar o perfil. Tenta continuar novamente.");
      return;
    }

    window.sessionStorage.removeItem(pendingSignupEmailKey);
    await onVerified();
  }

  async function resendCode() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/perfil?onboarding=1")}` },
    });
    setBusy(false);
    setCooldown(cooldownSeconds);
    setMessage(
      error
        ? "Não foi possível pedir outro código agora. Aguarda um pouco e tenta novamente."
        : "Se este email ainda não estiver confirmado, enviámos um novo código."
    );
  }

  function changeEmail() {
    if (busy) return;
    window.sessionStorage.removeItem(pendingSignupEmailKey);
    onChangeEmail();
  }

  return (
    <form onSubmit={verifyCode} noValidate>
      <p className="text-sm leading-relaxed text-foreground-muted">
        Código enviado para <strong className="text-foreground-secondary">{email}</strong>.
      </p>
      <label htmlFor="signup-code" className="mt-6 block">
        <span className="mb-2 block text-sm font-bold text-foreground-secondary">Código de confirmação</span>
        <input
          ref={inputRef}
          id="signup-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          aria-describedby="signup-code-message"
          className="focus-ring h-14 w-full rounded-md border border-input-border bg-input px-4 text-center font-mono text-2xl font-black tracking-widest text-foreground outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="pressable focus-ring mt-5 w-full rounded-full bg-foreground px-5 py-4 text-sm font-black text-background disabled:cursor-wait disabled:opacity-50"
      >
        {busy ? "A confirmar..." : "Confirmar email"}
      </button>
      <button
        type="button"
        onClick={resendCode}
        disabled={busy || cooldown > 0}
        className="pressable focus-ring mt-3 w-full rounded-full border border-border-strong px-5 py-4 text-sm font-bold text-foreground-secondary disabled:opacity-50"
      >
        {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
      </button>
      <button
        type="button"
        onClick={changeEmail}
        disabled={busy}
        className="focus-ring mt-4 w-full text-center text-sm font-bold text-foreground-muted underline underline-offset-4 disabled:opacity-50"
      >
        Alterar email
      </button>
      <p id="signup-code-message" role="status" aria-live="polite" className="mt-5 rounded-md border border-border bg-background-subtle px-4 py-3 text-center text-sm font-bold text-foreground-secondary">
        {message}
      </p>
    </form>
  );
}
