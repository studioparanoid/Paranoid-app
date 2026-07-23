import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketReservationClient } from "@/components/TicketReservationClient";
import { supabase } from "@/lib/supabase/public";

type TicketMode = "none" | "external" | "internal";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
  price: string | null;
  image_url: string | null;
  ticket_mode: TicketMode | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  ticket_button_label: string | null;
  status: string | null;
};

async function getEvent(slug: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,display_date,display_time,price,image_url,ticket_mode,ticket_price,ticket_capacity,ticket_button_label,status"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EventRow;
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event || event.ticket_mode !== "internal") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <Link
          href={`/eventos/${event.slug}`}
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar ao evento
        </Link>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            {event.image_url ? (
              <div
                className="h-80 rounded-[2rem] bg-cover bg-center lg:h-[720px] lg:rounded-[3rem]"
                style={{ backgroundImage: `url(${event.image_url})` }}
              />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-[2rem] border border-zinc-800 bg-zinc-950 lg:h-[720px] lg:rounded-[3rem]">
                <p className="text-center text-4xl font-black text-zinc-700">
                  Bilheteira Paranoid
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="rounded-[2.5rem] border border-red-950 bg-red-950/20 p-6 lg:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-red-500">
                Bilheteira Paranoid
              </p>

              <h1 className="mt-4 text-5xl font-black leading-none tracking-tight lg:text-7xl">
                {event.title}
              </h1>

              <div className="mt-8 space-y-4 text-sm text-zinc-400">
                <p>
                  <span className="font-bold text-zinc-300">Data:</span>{" "}
                  {event.display_date || "Data por definir"}
                  {event.display_time ? ` · ${event.display_time}` : ""}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Local:</span>{" "}
                  {[event.venue_name, event.city].filter(Boolean).join(" · ") ||
                    "Local por definir"}
                </p>

                <p>
                  <span className="font-bold text-zinc-300">Preço:</span>{" "}
                  {event.ticket_price || event.price || "Preço por definir"}
                </p>

                {event.ticket_capacity && (
                  <p>
                    <span className="font-bold text-zinc-300">Lotação:</span>{" "}
                    {event.ticket_capacity}
                  </p>
                )}
              </div>
            </div>

            <TicketReservationClient
              event={{
                id: event.id,
                slug: event.slug,
                title: event.title,
                ticket_price: event.ticket_price,
                ticket_capacity: event.ticket_capacity,
              }}
            />
          </div>
        </section>
      </section>
    </main>
  );
}