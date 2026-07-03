import { ProfileClient } from "@/components/ProfileClient";

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Perfil
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          A tua zona Paranoid.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Preferências, cidades, categorias e sinais para a app saber onde te
          mandar.
        </p>

        <ProfileClient />
      </section>
    </main>
  );
}