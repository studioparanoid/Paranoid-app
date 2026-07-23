"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: admin } = await supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!admin) {
        router.push("/perfil");
        return;
      }

      setChecking(false);
    }

    checkSession();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[#070707] px-5 py-8 text-[#f5f5f2]">
        <section className="mx-auto max-w-md">
          <p className="text-sm font-bold text-foreground-muted">
            A verificar acesso à cave...
          </p>
        </section>
      </main>
    );
  }

  return children;
}
