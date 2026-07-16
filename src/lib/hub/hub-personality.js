/** @typedef {import("./types").HubConversationContext} HubConversationContext */
/** @typedef {import("./types").HubResponse} HubResponse */

export const hubPersonality = {
  name: "Paranoid",
  traits: ["underground", "inteligente", "descontraída", "objetiva", "ligeiramente irreverente"],
  boundaries: ["nunca infantil", "nunca ofensiva", "nunca demasiado formal", "nunca inventar resultados"],
  avoidPhrases: ["Lamento", "Infelizmente", "Como IA", "modelo de linguagem"],
  responseStyle: "Frases curtas, naturais e úteis. Pequenas ações dentro da conversa quando existir um destino real.",
};

export const heavyNightGenres = ["metal", "hardcore", "punk", "doom", "rock"];

/** @param {string} value */
function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9€\s.,-]/g, " ").replace(/\s+/g, " ").trim();
}

/** @param {string} value */
export function extractBudget(value) {
  const query = normalize(value);
  const match = query.match(/(?:tenho|orcamento(?: de)?|posso gastar|ate|menos de)\s+(\d+(?:[.,]\d+)?)\s*(?:€|euros?)?/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 && amount <= 10000 ? amount : null;
}

/** @param {string} value */
export function getMusicMeaning(value) {
  const query = normalize(value);
  return /\bnoite\s+(?:bem\s+)?pesada\b|\bsom\s+pesado\b|\bmusica\s+pesada\b/.test(query) ? [...heavyNightGenres] : [];
}

/**
 * @param {string} value
 * @param {HubConversationContext} [context]
 * @returns {HubResponse | null}
 */
export function getHubPersonalityResponse(value, context = {}) {
  const query = normalize(value);
  const command = query.replace(/[.,]/g, "").trim();

  if (command === "agenda") {
    return { intent: "agenda", title: "Abro-te a agenda", description: "", results: [], actions: [{ label: "Abrir Agenda", href: "/agenda", primary: true }], context };
  }

  if (command === "mapa" || command === "abrir mapa") {
    return { intent: "map", title: "Vamos ver o que está perto de ti", description: "", results: [], actions: [{ label: "Abrir Mapa", href: "/mapa", primary: true }], context };
  }

  if (command === "bilhetes") {
    return { intent: "tickets", title: "Aqui tens os teus bilhetes", description: "", results: [], actions: [{ label: "Abrir Bilhetes", href: "/bilhetes", primary: true }], context };
  }

  if (command === "loja") {
    return { intent: "shop", title: "Vamos à loja", description: "", results: [], actions: [{ label: "Abrir Loja", href: "/loja", primary: true }], context };
  }

  if (command === "tenho fome") {
    return {
      intent: "dining",
      title: context.city || context.eventTitle ? "Vamos encontrar comida a sério" : "Diz-me onde estás para procurar opções perto de ti",
      description: context.city ? `Posso procurar em ${context.city} sem inventar locais.` : context.eventTitle ? `Posso procurar opções confirmadas em ${context.eventTitle}.` : "",
      results: [],
      actions: [{ label: "Abrir mapa", href: "/mapa" }],
      context,
    };
  }

  if (/\bnoite\s+(?:bem\s+)?pesada\b|\bsom\s+pesado\b|\bmusica\s+pesada\b/.test(command)) {
    return {
      intent: "agenda",
      title: "Pesada musicalmente?",
      description: "Posso procurar metal, doom, sludge, hardcore, punk e rock.",
      results: [],
      actions: [{ label: "Abrir Agenda", href: "/agenda", primary: true }],
      context: { ...context, preferredGenres: ["metal", "doom", "sludge", "hardcore", "punk", "rock"] },
    };
  }

  if (/comer pedras|beber terra|comer terra/.test(query)) {
    return {
      intent: "dining",
      title: "Para isso qualquer descampado serve",
      description: context.city ? `Para comida a sério, posso procurar em ${context.city}.` : "Para comida a sério, diz-me onde estás.",
      results: [],
      actions: [{ label: "Abrir mapa", href: "/mapa", primary: true }],
      context,
    };
  }

  if (/nao quero ouvir\s+/.test(query)) {
    const avoided = query.replace(/^.*nao quero ouvir\s+/, "").trim().slice(0, 40);
    return {
      intent: "agenda",
      title: `Está bem, ${avoided || "isso"} fica de fora`,
      description: context.city ? `Agora diz-me quando queres sair em ${context.city}.` : "Em que cidade queres procurar?",
      results: [],
      actions: [{ label: "Ver agenda", href: "/agenda" }],
      context: { ...context, avoidTerms: [...(context.avoidTerms || []), avoided].filter(Boolean) },
    };
  }

  const budget = extractBudget(query);
  const isBudgetStatement = budget !== null && /^(?:eu\s+)?(?:tenho|orcamento|posso gastar)\b/.test(query);
  if (isBudgetStatement) {
    return {
      intent: "unknown",
      title: `${budget.toFixed(budget % 1 === 0 ? 0 : 2)} € de margem`,
      description: "Fica como teto para esta conversa. O que queres fazer com esse orçamento?",
      results: [],
      actions: [{ label: "Tenho fome", href: "/?focus=hub" }, { label: "Ver eventos", href: "/agenda" }],
      context: { ...context, budgetMax: budget },
    };
  }

  return null;
}
