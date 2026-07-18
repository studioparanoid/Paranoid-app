import type { HubConversationContext, HubEventResult, HubIntent, HubResponse } from "@/lib/hub/types";
import { extractBudget, getHubPersonalityResponse, getMusicMeaning } from "./hub-personality.js";

export type HubEventRecord = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  municipality: string | null;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
  start_at: string | null;
  start_date: string | null;
  category: string | null;
  price: string | null;
  ticket_price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
};

type HubRouterContext = {
  authenticated: boolean;
  profileCity: string | null;
  conversation?: HubConversationContext;
  now?: Date;
};

const agendaTerms = ["agenda", "evento", "eventos", "concert", "festival", "festa", "noite", "sair", "acontecer", "hoje", "agora", "metal", "musica", "dj"];
const mapTerms = ["mapa", "onde fica", "como chegar", "direcao", "direcoes", "localizacao"];
const nearbyTerms = ["perto de mim", "a minha volta", "por aqui", "proximo evento", "proximos de mim"];
const ticketTerms = ["bilhete", "bilhetes", "meus bilhetes", "carteira"];
const shopTerms = ["loja", "merch", "t-shirt", "tshirt", "camisola", "comprar merch"];
const profileTerms = ["perfil", "minha conta", "a minha conta", "definicoes", "editar perfil"];
const diningTerms = ["tenho fome", "tenho sede", "cheio de sede", "cheia de sede", "com sede", "comer", "restaurante", "jantar", "almocar", "petiscar", "beber um copo", "bar aberto"];
const ignoredSearchTerms = new Set(["agenda", "evento", "eventos", "concertos", "concerto", "festival", "festivais", "quero", "ver", "mostra", "mostrar", "encontra", "encontrar", "gastar", "menos", "ate", "euro", "euros", "que", "ha", "hoje", "agora", "onde", "esta", "estao", "acontecer", "acontecendo", "perto", "mim", "em", "no", "na", "nos", "nas", "de", "do", "da", "dos", "das", "um", "uma", "o", "a", "e"]);

export function normalizeHubText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9€\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(query: string, terms: string[]) {
  return terms.some((term) => query.includes(term));
}

export function classifyHubQuery(value: string): HubIntent {
  const query = normalizeHubText(value);
  if (includesAny(query, ticketTerms)) return "tickets";
  if (includesAny(query, shopTerms)) return "shop";
  if (includesAny(query, profileTerms)) return "profile";
  if (query.includes("lineup") || query.includes("line up") || query.includes("programa do festival")) return "lineup";
  if (includesAny(query, diningTerms)) return "dining";
  if (includesAny(query, nearbyTerms)) return "nearby";
  if (includesAny(query, mapTerms)) return "map";
  if (includesAny(query, agendaTerms) || /(?:menos de|ate)\s+\d+/.test(query)) return "agenda";
  return "unknown";
}

function eventDate(event: HubEventRecord) {
  const value = event.start_at || event.start_date;
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function eventSearchText(event: HubEventRecord) {
  return normalizeHubText([event.title, event.category, event.city, event.municipality, event.venue_name, event.description].filter(Boolean).join(" "));
}

function priceNumber(event: HubEventRecord) {
  const value = event.ticket_price || event.price || "";
  if (/gratuito|gratis|free/i.test(value)) return 0;
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function toResult(event: HubEventRecord): HubEventResult {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    displayDate: event.display_date || event.start_date || "Data por definir",
    displayTime: event.display_time,
    venueName: event.venue_name,
    city: event.municipality || event.city,
    category: event.category,
    price: event.ticket_price || event.price,
    imageUrl: event.image_url,
  };
}

function findRequestedCity(query: string, events: HubEventRecord[], profileCity: string | null) {
  const cities = Array.from(new Set(events.flatMap((event) => [event.municipality, event.city]).filter((value): value is string => Boolean(value))));
  const requested = cities.find((city) => query.includes(normalizeHubText(city)));
  return requested || profileCity;
}

function sortEvents(events: HubEventRecord[]) {
  return [...events].sort((first, second) => {
    const featured = Number(Boolean(second.featured)) - Number(Boolean(first.featured));
    if (featured) return featured;
    return (eventDate(first)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (eventDate(second)?.getTime() ?? Number.MAX_SAFE_INTEGER);
  });
}

function usefulQueryTerms(query: string) {
  return query.split(" ").filter((term) => term.length > 2 && !ignoredSearchTerms.has(term) && !/^\d+$/.test(term));
}

function emptyResponse(description = "Queres encontrar um evento, comer qualquer coisa ou saber o que está a acontecer agora?", intent: HubIntent = "unknown"): HubResponse {
  return {
    intent,
    title: "Não apanhei bem o que procuras.",
    description,
    results: [],
    actions: [],
  };
}

export function buildHubResponse(value: string, events: HubEventRecord[], context: HubRouterContext): HubResponse {
  const query = normalizeHubText(value);
  const intent = classifyHubQuery(query);
  const personalityResponse = getHubPersonalityResponse(value, context.conversation);
  if (personalityResponse) return personalityResponse;

  if (intent === "tickets") {
    return {
      intent,
      title: context.authenticated ? "Os teus bilhetes estão na carteira" : "Entra para veres os teus bilhetes",
      description: context.authenticated ? "Podes consultar os próximos bilhetes e os respetivos códigos de entrada." : "A carteira é privada e precisa de uma sessão autenticada.",
      results: [],
      actions: [{ label: context.authenticated ? "Abrir Bilhetes" : "Iniciar sessão", href: context.authenticated ? "/bilhetes" : "/login?next=%2Fbilhetes", primary: true }],
    };
  }

  if (intent === "shop") {
    return { intent, title: "Vamos à loja.", description: "Merch, edições e produtos independentes.", results: [], actions: [{ label: "Abrir Loja", href: "/loja", primary: true }] };
  }

  if (intent === "map") {
    return { intent, title: "Vamos ao mapa.", description: "Mostro-te os eventos e locais publicados.", results: [], actions: [{ label: "Abrir Mapa", href: "/mapa", primary: true }] };
  }

  if (intent === "profile") {
    return { intent, title: "Vamos ao teu perfil.", description: "Dados, guardados, bilhetes e definições.", results: [], actions: [{ label: "Abrir Perfil", href: "/perfil", primary: true }] };
  }

  if (intent === "dining") {
    const budget = context.conversation?.budgetMax;
    const budgetLabel = budget == null ? "" : ` até ${budget.toFixed(budget % 1 === 0 ? 0 : 2)} €`;
    return {
      intent,
      title: context.conversation?.city ? "Boa." : "Onde estás?",
      description: context.conversation?.city ? `Estás em ${context.conversation.city}${budgetLabel}. Queres comer antes de sair ou já estás num evento?` : "",
      results: [],
      actions: [],
      context: context.conversation?.city ? { ...context.conversation, pendingIntent: null } : { ...context.conversation, pendingQuestion: "city", pendingIntent: "dining" },
    };
  }

  const now = context.now || new Date();
  const today = dateKey(now);
  const requestedCity = findRequestedCity(query, events, intent === "nearby" ? context.profileCity || context.conversation?.city || null : context.conversation?.city || null);
  const upcoming = sortEvents(events.filter((event) => {
    const date = eventDate(event);
    return !date || dateKey(date) >= today;
  }));

  if (intent === "nearby" && !requestedCity) {
    return {
      intent,
      title: "Em que cidade estás?",
      description: "",
      results: [],
      actions: [],
      context: { ...context.conversation, pendingQuestion: "city", pendingIntent: "nearby" },
    };
  }

  if (intent === "lineup") {
    const terms = usefulQueryTerms(query).filter((term) => term !== "lineup" && term !== "programa");
    if (terms.length === 0) {
      return { intent, title: "De que festival estás a falar?", description: "Diz-me o nome e continuo daqui.", results: [], actions: [] };
    }
    const matches = sortEvents(upcoming.filter((event) => terms.length > 0 && terms.some((term) => eventSearchText(event).includes(term)))).slice(0, 3);
    if (!matches.length) return emptyResponse("Não encontrei um evento publicado com esse nome. Queres tentar o nome completo?", intent);
    return {
      intent,
      title: matches.length === 1 ? "Encontrei este evento." : "Encontrei estes eventos.",
      description: "Abre o evento para veres o programa publicado.",
      results: matches.map(toResult),
      actions: [{ label: "Abrir Agenda", href: "/agenda" }],
    };
  }

  if (intent === "agenda" || intent === "nearby") {
    const todayRequested = query.includes("hoje") || query.includes("agora");
    const budget = extractBudget(query) ?? context.conversation?.budgetMax ?? null;
    const musicMeaning = getMusicMeaning(query);
    const terms = (musicMeaning.length ? musicMeaning : usefulQueryTerms(query)).filter((term) => normalizeHubText(requestedCity || "") !== term);
    const avoidedTerms = context.conversation?.avoidTerms || [];
    let matches = upcoming.filter((event) => {
      const searchText = eventSearchText(event);
      if (todayRequested && eventDate(event) && dateKey(eventDate(event)!) !== today) return false;
      if (requestedCity && !searchText.includes(normalizeHubText(requestedCity))) return false;
      if (avoidedTerms.some((term) => searchText.includes(normalizeHubText(term)))) return false;
      if (budget !== null) {
        const price = priceNumber(event);
        if (price === null || price > budget) return false;
      }
      return terms.length === 0 || terms.some((term) => searchText.includes(term));
    });
    matches = sortEvents(matches).slice(0, 4);
    if (!matches.length) return emptyResponse("Por agora, não encontrei nada publicado com esse filtro. Queres mudar a cidade, a data ou o género?", intent);
    const countLabel = ["zero", "uma", "duas", "três", "quatro"][matches.length];
    const cityLabel = requestedCity ? ` em ${requestedCity}` : "";
    const dateLabel = todayRequested || requestedCity ? "" : " para os próximos dias";
    return {
      intent,
      title: `${todayRequested ? "Hoje tenho" : "Tenho"} ${countLabel} ${matches.length === 1 ? "sugestão" : "sugestões"}${cityLabel}${dateLabel}.`,
      description: musicMeaning.length ? "Fiquei por metal, hardcore, punk, doom e rock." : "É isto que está publicado neste momento.",
      results: matches.map(toResult),
      actions: [{ label: "Abrir Agenda", href: "/agenda", primary: true }, { label: "Ver no Mapa", href: "/mapa" }],
      context: musicMeaning.length ? { ...context.conversation, preferredGenres: musicMeaning } : context.conversation,
    };
  }

  return emptyResponse();
}
