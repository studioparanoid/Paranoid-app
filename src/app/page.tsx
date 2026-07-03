import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { ForYouClient } from "@/components/ForYouClient";
import { getEvents } from "@/lib/events";

function HomeSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default async function Home() {
  const events = await getEvents();

  const todayEvents = events.filter((event) => event.date === "Hoje");
  const featuredEvents = events.filter((event) => event.featured);
  const freeEvents = events.filter((event) => event.price === "Entrada livre");
  const weekendEvents = events.filter(
    (event) => event.date === "Sábado" || event.date === "Domingo"
  );

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f2f1ec]">
      <section className="mx-auto max-w-md px-5 py-8">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-red-700">
            Paranoid
          </p>

          <h1 className="text-5xl font-black leading-none tracking-tight">
            Abres a Paranoid. Sabes onde tens de estar.
          </h1>

          <p className="mt-5 text-base text-zinc-400">
            Eventos, espaços, artistas e cultura alternativa na zona centro.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/agenda"
              className="rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black"
            >
              Ver agenda
            </Link>

            <Link
              href="/submeter"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
            >
              Submeter evento
            </Link>
          </div>
        </div>

        <ForYouClient events={events} />

        <HomeSection
          title="Hoje"
          subtitle="O que ainda dá para apanhar antes da noite morrer."
        >
          {todayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </HomeSection>

        <HomeSection
          title="Escolha Paranoid"
          subtitle="Curadoria suja, não algoritmo morto."
        >
          {featuredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </HomeSection>

        <HomeSection
          title="Entrada livre"
          subtitle="Cultura sem desculpa de orçamento."
        >
          {freeEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </HomeSection>

        <HomeSection
          title="Este fim de semana"
          subtitle="Sábado e domingo já mexem."
        >
          {weekendEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </HomeSection>
      </section>
    </main>
  );
}