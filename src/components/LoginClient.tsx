"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

export function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push("/admin");
    }
  }

  checkSession();
}, [router]);

  async function handleLogin() {
    setMessage("");

    if (!email || !password) {
      setMessage("Falta email ou password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("Login falhou. Credenciais erradas ou cave fechada.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@paranoid.pt"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        {message && (
          <p className="text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}