"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthFormCard } from "@/components/auth/AuthPageLayout";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { Button, LoadingButton } from "@/components/ui/Button";
import { safeInternalPath } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase/public";

export function MfaChallengeClient() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: userData }, { data: factors }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (!active) return;
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const factor = factors?.totp.find((item) => item.status === "verified");
      if (!factor) {
        const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
        router.replace(next);
        return;
      }
      setFactorId(factor.id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || !factorId || loading) return;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setLoading(false);
      setMessage("O código não está correto. Confirma na aplicação autenticadora.");
      return;
    }
    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
    router.replace(next);
    router.refresh();
  }

  async function signOut() {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <AuthFormCard eyebrow="Segurança" title="Confirma que és tu.">
      <p className="mb-6 text-sm leading-relaxed text-zinc-400">Introduz o código da tua aplicação autenticadora.</p>
      <form onSubmit={verify}>
        <label htmlFor="mfa-code" className="mb-2 block text-sm font-bold text-zinc-300">Código de seis dígitos</label>
        <MfaCodeInput value={code} onChange={setCode} disabled={loading} autoFocus />
        <p id="mfa-code-help" className="sr-only">Código numérico com seis dígitos.</p>
        {message && <p role="alert" className="mt-4 text-sm font-bold text-red-300">{message}</p>}
        <div className="mt-6 grid gap-3">
          <LoadingButton type="submit" loading={loading} loadingText="A confirmar..." disabled={code.length !== 6}>Confirmar</LoadingButton>
          <Button type="button" variant="secondary" onClick={() => void signOut()} disabled={loading}>Terminar sessão</Button>
        </div>
      </form>
    </AuthFormCard>
  );
}
