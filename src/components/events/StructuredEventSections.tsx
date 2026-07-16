"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ActivePromotion, EventService, EventTicket, FoodOption, LiveStatus, ProgramItem, TransportRoute } from "@/lib/data/contracts";

type StructuredPayload = {
  program: ProgramItem[];
  food: FoodOption[];
  promotions: ActivePromotion[];
  services: EventService[];
  transport: TransportRoute[];
  live: LiveStatus[];
  tickets: EventTicket[];
};

function time(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(value));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-t border-[var(--border)] pt-6"><h2 className="text-xs font-black uppercase text-red-700">{title}</h2><div className="mt-4">{children}</div></section>;
}

export function StructuredEventSections({ eventId }: { eventId: string }) {
  const [data, setData] = useState<StructuredPayload | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/events/${eventId}/structured`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload) setData(payload as StructuredPayload); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [eventId]);
  if (!data) return null;
  const hasContent = data.program.length || data.food.length || data.promotions.length || data.services.length || data.transport.length || data.live.length || data.tickets.length;
  if (!hasContent) return null;

  return <div className="space-y-7">
    {data.live.length > 0 && <Section title="Agora"><ul className="divide-y divide-[var(--border)]">{data.live.map((item) => <li key={item.id} className="py-3"><strong className="text-[var(--foreground)]">{item.message || item.statusType.replaceAll("_", " ")}</strong><p className="mt-1 text-xs text-[var(--foreground-muted)]">Atualização oficial · válida até {time(item.expiresAt)}</p></li>)}</ul></Section>}
    {data.program.length > 0 && <Section title="Programa e lineup"><ul className="divide-y divide-[var(--border)]">{data.program.map((item) => <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[72px_1fr]"><strong className="text-[var(--foreground)]">{time(item.actualStartAt || item.scheduledStartAt)}</strong><div><p className="font-black text-[var(--foreground)]">{item.artists.map((artist) => artist.name).join(" + ") || item.title}</p><p className="text-xs text-[var(--foreground-muted)]">{[item.zoneName, item.status === "delayed" ? `${item.delayMinutes} min de atraso` : null].filter(Boolean).join(" · ")}</p></div></li>)}</ul></Section>}
    {data.tickets.length > 0 && <Section title="Bilhetes"><ul className="divide-y divide-[var(--border)]">{data.tickets.map((ticket) => <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-4 py-3"><div><strong>{ticket.name}</strong><p className="text-xs text-[var(--foreground-muted)]">{[ticket.channelName, ticket.availableCapacity != null ? `${ticket.availableCapacity} disponíveis` : null, ticket.description].filter(Boolean).join(" · ")}</p></div><div className="flex items-center gap-3"><span className="font-black">{ticket.priceAmount == null ? "Consultar" : `${ticket.priceAmount.toFixed(2)} ${ticket.currency}`}</span>{ticket.purchaseUrl && <a href={ticket.purchaseUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-red-700 hover:text-red-600">Comprar</a>}</div></li>)}</ul></Section>}
    {data.promotions.length > 0 && <Section title="Promoções ativas"><ul className="space-y-3">{data.promotions.map((item) => <li key={item.id}><strong>{item.title}</strong><p className="text-sm text-[var(--foreground-muted)]">{item.description || item.terms} · até {time(item.endsAt)}</p></li>)}</ul></Section>}
    {data.food.length > 0 && <Section title="Comida e bebida"><ul className="divide-y divide-[var(--border)]">{data.food.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3"><div><strong>{item.vendorName}: {item.name}</strong><p className="text-xs text-[var(--foreground-muted)]">{[item.vegan ? "Vegan" : null, item.vegetarian ? "Vegetariano" : null, item.soldOut ? "Esgotado" : null, item.allergenInformationConfirmed ? null : "Alergénios por confirmar"].filter(Boolean).join(" · ")}</p></div><span className="shrink-0 font-black">{item.priceAmount.toFixed(2)} {item.currency}</span></li>)}</ul></Section>}
    {data.services.length > 0 && <Section title="Serviços"><ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{data.services.map((item) => <li key={item.id}><strong>{item.name}</strong><p className="text-xs text-[var(--foreground-muted)]">{[item.description, item.accessible ? "Acessível" : null].filter(Boolean).join(" · ")}</p></li>)}</ul></Section>}
    {data.transport.length > 0 && <Section title="Transportes"><ul className="space-y-4">{data.transport.map((route) => <li key={route.id}><strong>{route.originName} → {route.destinationName}</strong>{route.departures.length > 0 && <p className="mt-1 text-sm text-[var(--foreground-muted)]">Próximas partidas: {route.departures.map((departure) => `${time(departure.actualDepartureAt || departure.scheduledDepartureAt)}${departure.status !== "scheduled" ? ` (${departure.status})` : ""}`).join(" · ")}</p>}</li>)}</ul></Section>}
  </div>;
}
