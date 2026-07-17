"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { CardGrid } from "@/components/CardGrid";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/LoadingSkeleton";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/public";

type SavedEventRow = {
  event_id: string;
  created_at: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  city: string | null;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  start_at: string | null;
  start_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  category: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_price: string | null;
};

type SavedEvent = EventRow & {
  saved_at: string | null;
};

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function sortSavedEvents(events: SavedEvent[]) {
  return [...events].sort((first, second) => {
    const firstDate = eventDateValue(first);
    const secondDate = eventDateValue(second);
    if (!firstDate && !secondDate) return 0;
    if (!firstDate) return 1;
    if (!secondDate) return -1;
    return new Date(firstDate).getTime() - new Date(secondDate).getTime();
  });
}

function LoginCard() {
  return (
    <Card className="p-6 text-center lg:p-10">
      <h2 className="text-2xl font-black leading-tight text-foreground">Entra para guardar eventos.</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-foreground-muted">
        Guarda concertos, festas e sessões que não queres perder de vista.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href="/login" variant="primary">Entrar</LinkButton>
        <LinkButton href="/registar" variant="secondary">Criar conta</LinkButton>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-6 text-center lg:p-10">
      <h2 className="text-2xl font-black leading-tight text-foreground">Ainda não guardaste nada.</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-foreground-muted">
        Não encontrámos eventos guardados. Vai à agenda e guarda o que queres acompanhar.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href="/agenda" variant="primary">Ver agenda</LinkButton>
        <LinkButton href="/para-ti" variant="secondary">Para ti</LinkButton>
      </div>
    </Card>
  );
}

export default function SavedEventsPage() {
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [savedRows, setSavedRows] = useState<SavedEventRow[]>([]);
  const [events, setEvents] = useState<SavedEvent[]>([]);

  const sortedEvents = useMemo(() => sortSavedEvents(events), [events]);

  async function loadSavedEvents() {
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setUserId("");
      setSavedRows([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: savedData, error: savedError } = await supabase
      .from("saved_events")
      .select("event_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedError) {
      setMessage(savedError.message);
      setSavedRows([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedSavedRows = (savedData || []) as SavedEventRow[];
    setSavedRows(loadedSavedRows);

    const eventIds = loadedSavedRows.map((row) => row.event_id).filter(Boolean);

    if (eventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_price")
      .eq("status", "published")
      .in("id", eventIds);

    if (eventError) {
      setMessage(eventError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const savedMap = new Map<string, string | null>();
    loadedSavedRows.forEach((row) => savedMap.set(row.event_id, row.created_at));

    const loadedEvents = ((eventData || []) as EventRow[]).map((event) => ({
      ...event,
      saved_at: savedMap.get(event.id) || null,
    }));

    setEvents(loadedEvents);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSavedEvents(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function removeSavedEvent(eventId: string) {
    if (!userId) {
      setMessage("Tens de iniciar sessão para remover guardados.");
      return;
    }

    setRemovingId(eventId);
    setMessage("");

    const { error } = await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);

    if (error) {
      setMessage(error.message);
      setRemovingId("");
      return;
    }

    setSavedRows((current) => current.filter((row) => row.event_id !== eventId));
    setEvents((current) => current.filter((event) => event.id !== eventId));
    setRemovingId("");
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight lg:text-4xl">Guardados</h1>
            {!loading && userId && (
              <p className="mt-1 text-sm text-foreground-muted">
                {savedRows.length === 0 ? "Nada guardado" : savedRows.length === 1 ? "1 evento guardado" : `${savedRows.length} eventos guardados`}
              </p>
            )}
          </div>
        </header>

        {message && (
          <Card className="mt-6 border-danger/40 p-4">
            <p className="text-sm font-bold text-danger">{message}</p>
          </Card>
        )}

        <section className="mt-6">
          {loading && <EventCardSkeleton rows={4} />}

          {!loading && !userId && <LoginCard />}

          {!loading && userId && sortedEvents.length === 0 && <EmptyState />}

          {!loading && userId && sortedEvents.length > 0 && (
            <CardGrid>
              {sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    slug: event.slug,
                    title: event.title,
                    date: event.display_date || event.start_at || event.start_date || "Data por definir",
                    time: event.display_time,
                    venue: event.venue_name,
                    city: event.city,
                    price: event.price || event.ticket_price,
                    category: event.category,
                    image: event.image_url,
                    featured: event.featured,
                  }}
                  showSave={false}
                  action={(
                    <button
                      type="button"
                      onClick={() => removeSavedEvent(event.id)}
                      disabled={removingId === event.id}
                      aria-label={`Remover ${event.title} dos guardados`}
                      aria-busy={removingId === event.id}
                      className="pressable focus-ring grid h-11 w-11 place-items-center rounded-full border border-danger/40 bg-danger/15 text-danger disabled:opacity-50"
                    >
                      <AppIcon name="bookmark" className="h-4 w-4 fill-current" />
                    </button>
                  )}
                />
              ))}
            </CardGrid>
          )}
        </section>
      </section>
    </main>
  );
}
