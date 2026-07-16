import {
  getActivePromotions,
  getCurrentProgramItems,
  getEventFoodOptions,
  getEventProgram,
  getEventServices,
  getEventTransport,
  getLiveStatus,
  getNextProgramItems,
  searchEvents,
} from "@/lib/data/hub-tools";
import { normalizeHubText } from "@/lib/hub/router";
import type { HubResponse } from "@/lib/hub/types";

const subjectNoise = new Set([
  "estou", "no", "na", "nos", "nas", "do", "da", "dos", "das", "em", "e", "quero",
  "ver", "saber", "qual", "quais", "quem", "onde", "ha", "esta", "estao", "agora", "a",
  "seguir", "seguinte", "toca", "tocam", "lineup", "programa", "programacao", "festival",
  "palco", "concertos", "sobrepoem", "tenho", "minutos", "livres", "consigo", "comer",
  "vegan", "vegetariano", "happy", "hour", "bar", "mais", "proximo", "cozinha", "aberta",
  "wc", "acessivel", "shuttle", "proximo", "sai", "atrasado", "mudou", "servicos",
]);

function eventSubject(query: string) {
  return normalizeHubText(query)
    .split(" ")
    .filter((term) => term.length > 1 && !subjectNoise.has(term) && !/^\d+$/.test(term))
    .join(" ");
}

async function findEvent(query: string) {
  const subject = eventSubject(query);
  if (subject.length < 2) return { event: null, ambiguous: false };
  const response = await searchEvents({ query: subject, limit: 3 });
  return { event: response.data.length === 1 ? response.data[0] : null, ambiguous: response.data.length > 1 };
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(value));
}

function needsEvent(description: string): HubResponse {
  return { intent: "lineup", title: "Preciso do evento", description, results: [], actions: [{ label: "Abrir Agenda", href: "/agenda" }] };
}

export async function tryStructuredHubResponse(query: string): Promise<HubResponse | null> {
  const normalized = normalizeHubText(query);
  const asksProgram = /\b(lineup|programa|programacao|toca|tocam|palco|sobrepoem|seguir|seguinte)\b/.test(normalized);
  const asksFood = /\b(comer|vegan|vegetariano|cozinha|bar|happy hour)\b/.test(normalized);
  const asksService = /\b(wc|acessivel|medico|medical|agua|cacifo|carregamento|ponto de encontro)\b/.test(normalized);
  const asksTransport = /\b(shuttle|autocarro|transporte|partida)\b/.test(normalized);
  const asksLive = /\b(atrasado|atraso|mudou|cancelado|fila|agora)\b/.test(normalized);
  if (!asksProgram && !asksFood && !asksService && !asksTransport && !asksLive) return null;

  const { event, ambiguous } = await findEvent(query);
  if (!event) {
    if (normalized === "lineup" || normalized === "programa" || normalized === "programacao") {
      return { intent: "lineup", title: "Lineup", description: "De que festival queres ver a lineup?", results: [], actions: [{ label: "Abrir Agenda", href: "/agenda" }] };
    }
    return needsEvent(ambiguous ? "Encontrei mais do que um evento possível. Escreve o nome completo." : "Diz-me em que evento ou festival estás.");
  }

  const eventHref = `/eventos/${event.slug}`;
  if (asksProgram) {
    const currentRequested = /\b(agora|esta a tocar|toca agora)\b/.test(normalized);
    const nextRequested = /\b(seguir|seguinte|a seguir)\b/.test(normalized);
    const overlapRequested = /\b(sobrepoe|sobrepoem|simultaneo)\b/.test(normalized);
    const response = currentRequested
      ? await getCurrentProgramItems({ event: event.id })
      : nextRequested
        ? await getNextProgramItems({ event: event.id, limit: 5 })
        : await getEventProgram({ event: event.id, limit: 50 });
    if (!response.data.length) {
      return { intent: "lineup", title: event.title, description: "Ainda não existe programa estruturado e confirmado para este evento.", results: [], actions: [{ label: "Abrir evento", href: eventHref, primary: true }] };
    }

    let items = response.data;
    if (overlapRequested) {
      items = response.data.filter((item, index, all) => all.some((other, otherIndex) => {
        if (index === otherIndex || !item.scheduledEndAt || !other.scheduledEndAt) return false;
        return new Date(item.scheduledStartAt) < new Date(other.scheduledEndAt) && new Date(other.scheduledStartAt) < new Date(item.scheduledEndAt);
      }));
    }
    return {
      intent: "lineup",
      title: currentRequested ? `Agora em ${event.title}` : nextRequested ? `A seguir em ${event.title}` : `Programa de ${event.title}`,
      description: response.isLive ? "Informação em direto confirmada pela organização." : "Horários publicados pela organização.",
      results: [],
      details: items.slice(0, 20).map((item) => ({
        id: item.id,
        title: item.artists.map((artist) => artist.name).join(" + ") || item.title,
        meta: [timeLabel(item.actualStartAt || item.scheduledStartAt), item.zoneName, item.status === "delayed" ? `${item.delayMinutes} min de atraso` : null].filter(Boolean).join(" · "),
        href: eventHref,
      })),
      actions: [{ label: "Abrir evento", href: eventHref, primary: true }],
    };
  }

  if (asksFood) {
    if (normalized.includes("happy hour")) {
      const promotions = await getActivePromotions({ event: event.id });
      return { intent: "dining", title: `Promoções em ${event.title}`, description: promotions.data.length ? "Promoções ativas neste momento." : "Não há happy hours ativos e confirmados neste momento.", results: [], details: promotions.data.map((promotion) => ({ id: promotion.id, title: promotion.title, meta: `até ${timeLabel(promotion.endsAt)}`, href: eventHref })), actions: [{ label: "Abrir evento", href: eventHref }] };
    }
    const food = await getEventFoodOptions({ event: event.id, vegan: normalized.includes("vegan"), vegetarian: normalized.includes("vegetariano"), availableOnly: true });
    return { intent: "dining", title: `Comida e bebida em ${event.title}`, description: food.data.length ? "Opções disponíveis e publicadas pelos operadores." : "Não encontrei opções disponíveis e confirmadas para esse pedido.", results: [], details: food.data.map((item) => ({ id: item.id, title: `${item.vendorName}: ${item.name}`, meta: `${item.priceAmount.toFixed(2)} ${item.currency}${item.allergenInformationConfirmed ? "" : " · alergénios por confirmar"}`, href: eventHref })), actions: [{ label: "Abrir evento", href: eventHref }] };
  }

  if (asksService) {
    const type = normalized.includes("wc") ? (normalized.includes("acessivel") ? "accessible_toilet" : "toilet") : undefined;
    const services = await getEventServices({ event: event.id, type, accessible: normalized.includes("acessivel") });
    return { intent: "map", title: `Serviços em ${event.title}`, description: services.data.length ? "Serviços confirmados pela organização." : "Não encontrei um serviço confirmado que corresponda ao pedido.", results: [], details: services.data.map((service) => ({ id: service.id, title: service.name, meta: service.description, href: eventHref })), actions: [{ label: "Abrir evento", href: eventHref }, { label: "Ver mapa", href: "/mapa" }] };
  }

  if (asksTransport) {
    const transport = await getEventTransport({ event: event.id });
    const details = transport.data.flatMap((route) => route.departures.slice(0, 4).map((departure) => ({ id: departure.id, title: `${route.originName} → ${route.destinationName}`, meta: `${timeLabel(departure.actualDepartureAt || departure.scheduledDepartureAt)} · ${departure.status}`, href: eventHref })));
    return { intent: "map", title: `Transportes de ${event.title}`, description: details.length ? "Próximas partidas publicadas." : "Não encontrei partidas futuras confirmadas.", results: [], details, actions: [{ label: "Abrir evento", href: eventHref }] };
  }

  const live = await getLiveStatus({ event: event.id });
  return { intent: "agenda", title: `Estado de ${event.title}`, description: live.data.length ? "Atualizações oficiais ainda válidas." : "Não existem atualizações em direto ativas neste momento.", results: [], details: live.data.map((status) => ({ id: status.id, title: status.message || status.statusType.replaceAll("_", " "), meta: `válido até ${timeLabel(status.expiresAt)}`, href: eventHref })), actions: [{ label: "Abrir evento", href: eventHref }] };
}
