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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setChecking(false);
    }

    checkSession();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-sm font-bold text-zinc-500">
            A verificar acesso à cave...
          </p>
        </section>
      </main>
    );
  }

  return children;
}