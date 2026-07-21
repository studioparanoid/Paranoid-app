"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { Button, LoadingButton } from "@/components/ui/Button";
import { safeInternalPath } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase/public";

const resendCooldownSeconds = 60;

export function MfaEmailChallengeClient() {
  const router = useRouter();
  const sentRef = useRef(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  async function requestCode() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/mfa-email/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "login" }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error || "Não foi possível enviar o código. Tenta novamente.");
      return;
    }
    setEmail(payload.email || "");
    setCooldown(resendCooldownSeconds);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("email_mfa_enabled").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (!profile?.email_mfa_enabled) {
        const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
        router.replace(next);
        return;
      }
      if (!sentRef.current) {
        sentRef.current = true;
        void requestCode();
      }
    })();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/mfa-email/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "login", code }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoading(false);
      setMessage(payload.error || "O código não está correto.");
      return;
    }
    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
    // A full navigation (not router.replace) so the freshly-set MFA cookie is
    // guaranteed to be present on the very next request the browser makes —
    // a client-side soft navigation right after setting it was landing back
    // on this same page for some users.
    window.location.href = next;
  }

  async function signOut() {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <AuthFormCard eyebrow="Segurança" title="Confirma que és tu.">
      <p className="mb-6 text-sm leading-relaxed text-foreground-secondary">{email ? `Enviámos um código para ${email}.` : "A preparar o código de verificação..."}</p>
      <form onSubmit={verify}>
        <label htmlFor="mfa-code" className="mb-2 block text-sm font-bold text-foreground-secondary">Código de seis dígitos</label>
        <MfaCodeInput value={code} onChange={setCode} disabled={loading} autoFocus />
        <p id="mfa-code-help" className="sr-only">Código numérico com seis dígitos.</p>
        {message && <p role="alert" className="mt-4 text-sm font-bold text-danger">{message}</p>}
        <div className="mt-6 grid gap-3">
          <LoadingButton type="submit" loading={loading} loadingText="A confirmar..." disabled={code.length !== 6}>Confirmar</LoadingButton>
          <Button type="button" variant="ghost" onClick={() => void requestCode()} disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void signOut()} disabled={loading}>Terminar sessão</Button>
        </div>
      </form>
    </AuthFormCard>
  );
}
