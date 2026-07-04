import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { FollowButton } from "@/components/FollowButton";
import { getEvents } from "@/lib/events";
import {
  getOrganizerBySlug,
  getOrganizers,
} from "@/lib/organizers";

export async function generateStaticParams() {
  const organizers = await getOrganizers();

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

  const organizer = await getOrganizerBySlug(slug);

  if (!organizer) {
    notFound();
  }

  const events = await getEvents();

  const organizerEvents = events.filter(
    (event) =>
      event.organizerSlug === organizer.slug ||
      event.organizer === organizer.name
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

            <p className="mt-3 text-zinc-400">
              {organizer.city || "Cidade por definir"}
            </p>
          </div>

          {organizer.verified && (
            <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
              Verificado
            </span>
          )}
        </div>

        <p className="mt-6 text-lg leading-relaxed text-zinc-300">
          {organizer.description ||
            "Organizador cultural dentro da rede Paranoid."}
        </p>

        {organizer.pack && (
          <div className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
              Pack ativo
            </p>

            <h2 className="text-2xl font-black">{organizer.pack}</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Perfil público, eventos associados e presença dentro da rede
              Paranoid.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <FollowButton targetId={organizer.id} targetType="organizer" />

          {organizer.instagram && (
            <a
              href={organizer.instagram}
              target="_blank"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
            >
              Instagram
            </a>
          )}
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