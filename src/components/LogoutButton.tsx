"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400"
    >
      Sair
    </button>
  );
}