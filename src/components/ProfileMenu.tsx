"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { supabase } from "@/lib/supabase/public";

type ProfileSummary = { email: string; isOrganizer: boolean; isAdmin: boolean } | null;

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return <div ref={containerRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={profile ? "Abrir menu do perfil" : "Entrar ou criar conta"} aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-800 text-zinc-300 transition hover:border-zinc-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
      <AppIcon name="profile" />
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-zinc-800 bg-[#111] p-2 shadow-2xl">
      {profile ? <>
        <p className="truncate border-b border-zinc-800 px-3 py-3 text-xs text-zinc-500">{profile.email}</p>
        <MenuLink href="/perfil" label="Ver perfil" />
        <MenuLink href="/guardados" label="Guardados" />
        <MenuLink href="/bilhetes" label="Bilhetes" />
        <MenuLink href="/loja" label="Encomendas" />
        {profile.isOrganizer && <MenuLink href="/organizador" label="Área do organizador" />}
        {profile.isAdmin && <MenuLink href="/admin" label="Administração" />}
        <button type="button" onClick={signOut} className="w-full rounded px-3 py-3 text-left text-sm font-bold text-red-400 hover:bg-zinc-900">Terminar sessão</button>
      </> : <>
        <MenuLink href="/login" label="Entrar" />
        <MenuLink href="/registar" label="Criar conta" />
      </>}
    </div>}
  </div>;
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="block rounded px-3 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white">{label}</Link>;
}
