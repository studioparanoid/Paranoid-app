"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

type ProfileSummary = { email: string; isOrganizer: boolean; isAdmin: boolean } | null;

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary>(null);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const [profileResponse, adminResponse] = await Promise.all([
        supabase.from("profiles").select("account_type,account_status").eq("id", user.id).maybeSingle(),
        supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setProfile({
        email: user.email || "Conta Paranoid",
        isOrganizer: profileResponse.data?.account_type === "organizer" && profileResponse.data?.account_status === "approved",
        isAdmin: Boolean(adminResponse.data),
      });
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("a,button")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      toast({ message: "Não foi possível terminar a sessão.", tone: "error" });
      return;
    }
    window.location.href = "/";
  }

  return <div ref={containerRef} className="relative">
    <IconButton label={profile ? "Abrir menu do perfil" : "Entrar ou criar conta"} variant="secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" aria-controls="profile-menu">
      <AppIcon name="profile" />
    </IconButton>
    {open && <div ref={menuRef} id="profile-menu" role="menu" className="scale-in absolute right-0 top-12 z-50 w-64 rounded-lg border border-zinc-800 bg-[#111] p-2 shadow-2xl shadow-black/40">
      {profile ? <>
        <p className="truncate border-b border-zinc-800 px-3 py-3 text-xs text-zinc-500">{profile.email}</p>
        <MenuLink href="/perfil" label="Ver perfil" onSelect={() => setOpen(false)} />
        <MenuLink href="/guardados" label="Guardados" onSelect={() => setOpen(false)} />
        <MenuLink href="/bilhetes" label="Bilhetes" onSelect={() => setOpen(false)} />
        <MenuLink href="/loja" label="Encomendas" onSelect={() => setOpen(false)} />
        {profile.isOrganizer && <MenuLink href="/organizador" label="Área do organizador" onSelect={() => setOpen(false)} />}
        {profile.isAdmin && <MenuLink href="/admin" label="Administração" onSelect={() => setOpen(false)} />}
        <LoadingButton loading={signingOut} loadingText="A sair..." variant="ghost" size="sm" onClick={signOut} className="w-full justify-start px-3 text-red-400">Terminar sessão</LoadingButton>
      </> : <>
        <MenuLink href="/login" label="Entrar" onSelect={() => setOpen(false)} />
        <MenuLink href="/registar" label="Criar conta" onSelect={() => setOpen(false)} />
      </>}
    </div>}
  </div>;
}

function MenuLink({ href, label, onSelect }: { href: string; label: string; onSelect: () => void }) {
  return <Link href={href} role="menuitem" onClick={onSelect} className="interactive focus-ring block rounded px-3 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white">{label}</Link>;
}
