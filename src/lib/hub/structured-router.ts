import {
  getActivePromotions,
  getCurrentProgramItems,
  getEventFoodOptions,
  getEventProgram,
  getEventServices,
  getEventTickets,
  getEventTransport,
  getLiveStatus,
  getNextProgramItems,
  searchEvents,
} from "@/lib/data/hub-tools";
import { normalizeHubText } from "@/lib/hub/router";
import { getHubPersonalityResponse } from "@/lib/hub/hub-personality.js";
import type { HubConversationContext, HubResponse } from "@/lib/hub/types";

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

async function findEvent(query: string, context: HubConversationContext = {}) {
  const subject = eventSubject(query) || context.eventTitle || "";
  if (subject.length < 2) return { event: null, ambiguous: false };
  const response = await searchEvents({ query: subject, limit: 3 });
  if (response.data.length === 1) return { event: response.data[0], ambiguous: false };
  const normalizedSubject = normalizeHubText(subject);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const exactCurrent = response.data.filter((event) => normalizeHubText(event.title) === normalizedSubject).filter((event) => {
    const end = event.endsAt ? new Date(event.endsAt) : null;
    const start = event.startsAt ? new Date(event.startsAt) : null;
    return end ? end >= new Date() : !start || start >= todayStart;
  });
  return { event: exactCurrent.length === 1 ? exactCurrent[0] : null, ambiguous: response.data.length > 1 };
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(value));
}

function needsEvent(description: string): HubResponse {
  return { intent: "lineup", title: "Preciso do evento", description, results: [], actions: [{ label: "Abrir Agenda", href: "/agenda" }] };
}

export async function tryStructuredHubResponse(query: string, context: HubConversationContext = {}): Promise<HubResponse | null> {
  const normalized = normalizeHubText(query);
  const personalityResponse = getHubPersonalityResponse(query, context);
  if (personalityResponse) return personalityResponse;
  const locationStatement = normalized.match(/^estou\s+(?:no|na|em)\s+(.+)$/);
  if (locationStatement) {
    const found = await findEvent(query);
    if (found.event) {
      return { intent: "agenda", title: `Estás no ${found.event.title}`, description: "Fica como contexto desta conversa. Agora podes perguntar pela lineup, comida, serviços ou pelo que está a acontecer.", results: [], actions: [{ label: "Ver evento", href: `/eventos/${found.event.slug}`, primary: true }, { label: "Ver lineup", href: `/eventos/${found.event.slug}` }], context: { ...context, eventId: found.event.id, eventSlug: found.event.slug, eventTitle: found.event.title, city: found.event.city || context.city } };
    }
    const city = locationStatement[1].trim().replace(/\b(portugal|cidade)\b/g, "").trim();
    return { intent: "nearby", title: `Estás em ${city}`, description: "Certo. O que procuras por aí?", results: [], actions: [{ label: "Hoje perto de mim", href: "/agenda" }, { label: "Abrir mapa", href: "/mapa" }], context: { ...context, city } };
  }
  const asksProgram = /\b(lineup|programa|programacao|toca|tocam|palco|sobrepoem|seguir|seguinte)\b/.test(normalized);
  const asksFood = /\b(comer|vegan|vegetariano|cozinha|bar|happy hour)\b/.test(normalized);
  const asksService = /\b(wc|acessivel|medico|medical|agua|cacifo|carregamento|ponto de encontro)\b/.test(normalized);
  const asksTransport = /\b(shuttle|autocarro|transporte|partida)\b/.test(normalized);
  const asksLive = /\b(atrasado|atraso|mudou|cancelado|fila|agora)\b/.test(normalized);
  const asksTickets = /\b(bilhete|bilhetes|entrada|entradas)\b/.test(normalized) && Boolean(context.eventId);
  if (!asksProgram && !asksFood && !asksService && !asksTransport && !asksLive && !asksTickets) return null;

  const { event, ambiguous } = await findEvent(query, context);
  if (!event) {
    if (asksFood && !context.eventId) return null;
    if (normalized === "lineup" || normalized === "programa" || normalized === "programacao") {
      return { intent: "lineup", title: "Lineup", description: "De que festival queres ver a lineup?", results: [], actions: [{ label: "Abrir Agenda", href: "/agenda" }] };
    }
    return needsEvent(ambiguous ? "Encontrei mais do que um evento possível. Escreve o nome completo." : "Diz-me em que evento ou festival estás.");
  }

  const eventHref = `/eventos/${event.slug}`;
  const nextContext = { ...context, eventId: event.id, eventSlug: event.slug, eventTitle: event.title, city: event.city || context.city };
  if (asksTickets) {
    const tickets = await getEventTickets({ event: event.id });
    return { intent: "tickets", title: `Bilhetes para ${event.title}`, description: tickets.data.length ? "Isto é o que ainda está publicado." : "Não encontrei bilhetes disponíveis ou confirmados.", results: [], details: tickets.data.map((ticket) => ({ id: ticket.id, title: ticket.name, meta: ticket.priceAmount == null ? ticket.description : `${ticket.priceAmount.toFixed(2)} ${ticket.currency}`, href: ticket.purchaseUrl || eventHref })), actions: [{ label: "Ver evento", href: eventHref, primary: true }], context: nextContext };
  }
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
      return { intent: "lineup", title: event.title, description: "Ainda não tenho um programa confirmado para este evento.", results: [], actions: [{ label: "Ver evento", href: eventHref, primary: true }], context: nextContext };
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
      actions: [{ label: "Ver evento", href: eventHref, primary: true }, { label: "Abrir mapa", href: "/mapa" }, { label: "Bilhetes", href: eventHref }],
      context: nextContext,
    };
  }

  if (asksFood) {
    if (normalized.includes("happy hour")) {
      const promotions = await getActivePromotions({ event: event.id });
      return { intent: "dining", title: `Promoções em ${event.title}`, description: promotions.data.length ? "Estas estão ativas agora." : "Nada confirmado agora. Não te vou vender um happy hour fantasma.", results: [], details: promotions.data.map((promotion) => ({ id: promotion.id, title: promotion.title, meta: `até ${timeLabel(promotion.endsAt)}`, href: eventHref })), actions: [{ label: "Ver evento", href: eventHref }], context: nextContext };
    }
    const food = await getEventFoodOptions({ event: event.id, vegan: normalized.includes("vegan"), vegetarian: normalized.includes("vegetariano"), availableOnly: true });
    const withinBudget = context.budgetMax == null ? food.data : food.data.filter((item) => item.priceAmount <= context.budgetMax!);
    const budgetLabel = context.budgetMax == null ? "" : ` até ${context.budgetMax.toFixed(context.budgetMax % 1 === 0 ? 0 : 2)} €`;
    return { intent: "dining", title: `Comida e bebida em ${event.title}${budgetLabel}`, description: withinBudget.length ? "Encontrei isto disponível." : context.budgetMax == null ? "Não há opções confirmadas para esse pedido." : "Não há opções confirmadas dentro desse orçamento.", results: [], details: withinBudget.map((item) => ({ id: item.id, title: `${item.vendorName}: ${item.name}`, meta: `${item.priceAmount.toFixed(2)} ${item.currency}${item.allergenInformationConfirmed ? "" : " · alergénios por confirmar"}`, href: eventHref })), actions: [{ label: "Ver evento", href: eventHref }], context: nextContext };
  }

  if (asksService) {
    const type = normalized.includes("wc") ? (normalized.includes("acessivel") ? "accessible_toilet" : "toilet") : undefined;
    const services = await getEventServices({ event: event.id, type, accessible: normalized.includes("acessivel") });
    return { intent: "map", title: `Serviços em ${event.title}`, description: services.data.length ? "Foi isto que a organização confirmou." : "Não encontrei esse serviço nos dados do evento.", results: [], details: services.data.map((service) => ({ id: service.id, title: service.name, meta: service.description, href: eventHref })), actions: [{ label: "Ver evento", href: eventHref }, { label: "Abrir mapa", href: "/mapa" }], context: nextContext };
  }

  if (asksTransport) {
    const transport = await getEventTransport({ event: event.id });
    const details = transport.data.flatMap((route) => route.departures.slice(0, 4).map((departure) => ({ id: departure.id, title: `${route.originName} → ${route.destinationName}`, meta: `${timeLabel(departure.actualDepartureAt || departure.scheduledDepartureAt)} · ${departure.status}`, href: eventHref })));
    return { intent: "map", title: `Transportes de ${event.title}`, description: details.length ? "Estas são as próximas partidas publicadas." : "Não encontrei partidas futuras confirmadas.", results: [], details, actions: [{ label: "Ver evento", href: eventHref }, { label: "Abrir mapa", href: "/mapa" }], context: nextContext };
  }

  const live = await getLiveStatus({ event: event.id });
  return { intent: "agenda", title: `Estado de ${event.title}`, description: live.data.length ? "Há atualizações oficiais ainda válidas." : "Está tudo quieto: não há atualizações em direto ativas.", results: [], details: live.data.map((status) => ({ id: status.id, title: status.message || status.statusType.replaceAll("_", " "), meta: `válido até ${timeLabel(status.expiresAt)}`, href: eventHref })), actions: [{ label: "Ver evento", href: eventHref }], context: nextContext };
}
