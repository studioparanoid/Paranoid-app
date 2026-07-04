import Link from "next/link";
import { RegisterClient } from "@/components/RegisterClient";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/perfil" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Criar conta
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Entra no mapa.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Cria uma conta Paranoid para guardar eventos, seguir artistas e,
          mais tarde, gerir perfis de organizador, artista ou espaço.
        </p>

        <RegisterClient />
      </section>
    </main>
  );
}