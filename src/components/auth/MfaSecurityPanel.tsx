"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { Button, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

const resendCooldownSeconds = 60;

export function MfaSecurityPanel() {
  const [enabled, setEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("email_mfa_enabled").eq("id", user.id).maybeSingle();
    setEnabled(Boolean(data?.email_mfa_enabled));
    setMessage(error ? "Não foi possível consultar a segurança da conta." : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadStatus(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestCode() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/mfa-email/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "enroll" }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error || "Não foi possível enviar o código. Tenta novamente.");
      return;
    }
    setEnrolling(true);
    setCooldown(resendCooldownSeconds);
    setMessage(`Enviámos um código para ${payload.email}.`);
  }

  async function verifyEnrollment(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/mfa-email/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "enroll", code }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error || "O código não está correto.");
      return;
    }
    setEnrolling(false);
    setCode("");
    setEnabled(true);
    toast({ message: "Verificação por email ativada.", tone: "success" });
  }

  function cancelEnrollment() {
    if (loading) return;
    setEnrolling(false);
    setCode("");
    setMessage("");
  }

  async function disable() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/mfa-email/disable", { method: "POST" });
    setLoading(false);
    if (!response.ok) {
      setMessage("Não foi possível desativar a verificação por email.");
      return;
    }
    setEnabled(false);
    toast({ message: "Verificação por email desativada.", tone: "success" });
  }

  return (
    <section className="shadow-panel rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="security-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-accent">Segurança</p>
          <h2 id="security-title" className="mt-2 text-2xl font-black">Verificação por email</h2>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">{enabled ? "Proteção adicional ativa. Vamos pedir-te um código por email sempre que entrares." : "Adiciona proteção extra: ao entrar, enviamos-te um código de confirmação por email."}</p>
        </div>
        {!enrolling && !enabled && <Button onClick={() => void requestCode()} disabled={loading}>Ativar verificação por email</Button>}
        {!enrolling && enabled && <Button variant="secondary" onClick={() => void disable()} disabled={loading}>Desativar</Button>}
      </div>

      {enrolling && (
        <form className="mt-6" onSubmit={verifyEnrollment}>
          <label htmlFor="mfa-code" className="mb-2 block text-sm font-bold">Código de seis dígitos</label>
          <MfaCodeInput value={code} onChange={setCode} disabled={loading} autoFocus />
          <p id="mfa-code-help" className="sr-only">Código numérico com seis dígitos.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LoadingButton type="submit" loading={loading} loadingText="A confirmar..." disabled={code.length !== 6}>Confirmar</LoadingButton>
            <Button type="button" variant="secondary" onClick={cancelEnrollment} disabled={loading}>Cancelar</Button>
            <Button type="button" variant="ghost" onClick={() => void requestCode()} disabled={loading || cooldown > 0}>
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
            </Button>
          </div>
        </form>
      )}

      {message && <p className="mt-4 text-sm font-bold text-danger" role="alert">{message}</p>}
    </section>
  );
}
