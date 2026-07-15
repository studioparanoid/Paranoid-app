"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import type { Factor } from "@supabase/supabase-js";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { Button, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaSecurityPanel({ onboarding = false, onComplete }: { onboarding?: boolean; onComplete?: () => void }) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const loadFactors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp.filter((factor) => factor.status === "verified") ?? []);
    setMessage(error ? "Não foi possível consultar a segurança da conta." : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFactors(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFactors]);

  async function startEnrollment() {
    if (loading || enrollment) return;
    setLoading(true);
    setMessage("");
    if (factors.length > 0) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") {
        setLoading(false);
        setMessage("Confirma primeiro a sessão com o teu código de segurança.");
        return;
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Paranoid Authenticator",
    });
    setLoading(false);
    if (error || !data.totp) {
      setMessage("Não foi possível iniciar a configuração. Tenta novamente.");
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnrollment(event: FormEvent) {
    event.preventDefault();
    if (!enrollment || code.length !== 6 || loading) return;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    if (error) {
      setLoading(false);
      setMessage("O código não está correto. Confirma na aplicação autenticadora.");
      return;
    }
    setEnrollment(null);
    setCode("");
    await loadFactors();
    toast({ message: onboarding ? "Conta configurada." : "Autenticação de dois fatores ativada.", tone: "success" });
    onComplete?.();
  }

  async function cancelEnrollment() {
    if (!enrollment || loading) return;
    setLoading(true);
    await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setCode("");
    setLoading(false);
  }

  async function removeFactor(factorId: string) {
    if (factors.length <= 1 || loading) return;
    setLoading(true);
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") {
      setLoading(false);
      setMessage("Confirma primeiro a sessão com o teu código de segurança.");
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setMessage("Não foi possível remover o autenticador.");
    else await loadFactors();
    setLoading(false);
  }

  return (
    <section className="shadow-panel rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="security-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-red-600">Segurança</p>
          <h2 id="security-title" className="mt-2 text-2xl font-black">Autenticação de dois fatores</h2>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">{factors.length > 0 ? "Ativa" : "Obrigatória para ações protegidas da conta."}</p>
        </div>
        {!enrollment && <Button onClick={() => void startEnrollment()} disabled={loading}>{factors.length ? "Adicionar autenticador" : "Ativar"}</Button>}
      </div>

      {factors.length > 0 && <ul className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {factors.map((factor) => <li key={factor.id} className="flex min-h-14 items-center gap-3 py-2">
          <span className="min-w-0 flex-1 text-sm font-bold">{factor.friendly_name || "Aplicação autenticadora"}</span>
          <span className="text-xs font-bold text-emerald-500">Verificado</span>
          <Button variant="ghost" size="sm" disabled={loading || factors.length <= 1} onClick={() => void removeFactor(factor.id)} aria-label={`Remover ${factor.friendly_name || "autenticador"}`}>Remover</Button>
        </li>)}
      </ul>}

      {enrollment && <form className="mt-6" onSubmit={verifyEnrollment}>
        <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="rounded bg-white p-3">
            {/* Supabase returns a short-lived SVG data URL for this enrollment only. */}
            <Image src={enrollment.qrCode} alt="Código QR para configurar a aplicação autenticadora" width={180} height={180} unoptimized className="h-auto w-full" />
          </div>
          <div>
            <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">Digitaliza o QR code ou introduz esta chave manual:</p>
            <code className="mt-3 block select-all break-all rounded border border-[var(--border)] bg-[var(--input-background)] p-3 text-sm">{enrollment.secret}</code>
            <label htmlFor="mfa-code" className="mb-2 mt-5 block text-sm font-bold">Código de seis dígitos</label>
            <MfaCodeInput value={code} onChange={setCode} disabled={loading} autoFocus />
            <p id="mfa-code-help" className="sr-only">Código numérico com seis dígitos.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <LoadingButton type="submit" loading={loading} loadingText="A confirmar..." disabled={code.length !== 6}>Confirmar</LoadingButton>
          <Button type="button" variant="secondary" onClick={() => void cancelEnrollment()} disabled={loading}>Cancelar</Button>
        </div>
      </form>}
      {message && <p className="mt-4 text-sm font-bold text-red-400" role="alert">{message}</p>}
    </section>
  );
}
