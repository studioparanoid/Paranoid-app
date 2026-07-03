import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";
import { organizers } from "@/data/organizers";

export function generateStaticParams() {
  return organizers.map((organizer) => ({
    slug: organizer.slug,
  }));
}

export default async function OrganizerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const organizer = organizers.find((organizer) => organizer.slug === slug);

  if (!organizer) {
    notFound();
  }

  const organizerEvents = events.filter(
    (event) => event.organizerSlug === organizer.slug
  );

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <div className="mb-6 h-64 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-red-950" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Organizador
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight">
              {organizer.name}
            </h1>

            <p className="mt-3 text-zinc-400">{organizer.city}</p>
          </div>

          {organizer.verified && (
            <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
              Verificado
            </span>
          )}
        </div>

        <p className="mt-6 text-lg leading-relaxed text-zinc-300">
          {organizer.description}
        </p>

        <div className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
            Pack ativo
          </p>

          <h2 className="text-2xl font-black">{organizer.pack}</h2>

          <p className="mt-2 text-sm text-zinc-500">
            Perfil público, eventos associados e presença dentro da rede Paranoid.
          </p>
        </div>

        <div className="mt-8 flex gap-3">
          <button className="rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">
            Seguir organizador
          </button>

          <a
            href={organizer.instagram}
            target="_blank"
            className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
          >
            Instagram
          </a>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Eventos publicados</h2>
          <p className="mt-1 text-sm text-zinc-500">
            O que este organizador tem no mapa.
          </p>

          <div className="mt-4 space-y-4">
            {organizerEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {organizerEvents.length === 0 && (
            <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-400">
                Este organizador ainda não tem eventos publicados.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}