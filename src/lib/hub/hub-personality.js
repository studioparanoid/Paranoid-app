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
function cleanAnswer(value) {
  return value.trim().replace(/[.!?]+$/, "").trim().slice(0, 100);
}

/** @param {string} value */
function genreFromAnswer(value) {
  const genres = ["metal", "doom", "sludge", "hardcore", "punk", "rock", "jazz", "techno", "house", "hip hop", "rap", "indie", "pop"];
  return genres.filter((genre) => normalize(value).includes(genre));
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
  const answer = cleanAnswer(value);

  if (context.pendingQuestion === "city" && answer.length > 1) {
    if (context.pendingIntent === "dining") {
      return {
        intent: "dining",
        title: "Boa.",
        description: `Fico com ${answer}. Vou mostrar-te o que ainda está confirmado por perto.`,
        results: [],
        actions: [],
        context: { ...context, city: answer, pendingQuestion: null, pendingIntent: null },
      };
    }
    return {
      intent: "nearby",
      title: "Boa.",
      description: `Fico com ${answer}. Queres concertos, bares, DJs ou algo mais calmo?`,
      results: [],
      actions: [],
      context: { ...context, city: answer, pendingQuestion: "nightStyle", pendingIntent: null },
    };
  }

  if (context.pendingQuestion === "nightStyle" && answer.length > 1) {
    const preferredGenres = genreFromAnswer(answer);
    return {
      intent: "agenda",
      title: "Perfeito.",
      description: `${answer}${context.city ? ` em ${context.city}` : ""}. Queres ver o que está publicado hoje?`,
      results: [],
      actions: [{ label: "Ver hoje", href: "/agenda", primary: true }],
      context: {
        ...context,
        nightStyle: answer,
        preferredGenres: preferredGenres.length ? preferredGenres : context.preferredGenres,
        pendingQuestion: null,
        pendingIntent: null,
      },
    };
  }

  if (/\b(?:quero|vou)\s+sair\b/.test(query)) {
    return {
      intent: "nearby",
      title: "Boa.",
      description: context.city ? `Fico com ${context.city}. Queres concertos, bares, DJs ou algo mais calmo?` : "Em que cidade estás?",
      results: [],
      actions: [],
      context: { ...context, pendingQuestion: context.city ? "nightStyle" : "city", pendingIntent: context.city ? null : "agenda" },
    };
  }

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

  if (/\b(?:tenho|estou\s+(?:cheio|cheia)\s+de|estou\s+com|muita)\s+sede\b|\bcom sede\b/.test(command)) {
    return {
      intent: "dining",
      title: context.city ? "Boa." : "Onde estás?",
      description: context.city ? `Estás em ${context.city}. Posso mostrar-te o que ainda está ativo por perto.` : "",
      results: [],
      actions: [],
      context: context.city ? { ...context, pendingIntent: null } : { ...context, pendingQuestion: "city", pendingIntent: "dining" },
    };
  }

  if (command === "tenho fome") {
    return {
      intent: "dining",
      title: context.city || context.eventTitle ? "Boa." : "Onde estás?",
      description: context.city ? `Estás em ${context.city}. Queres comer antes de sair ou já estás num evento?` : context.eventTitle ? `Estás em ${context.eventTitle}. O que te apetece comer?` : "",
      results: [],
      actions: [],
      context: context.city || context.eventTitle ? { ...context, pendingIntent: null } : { ...context, pendingQuestion: "city", pendingIntent: "dining" },
    };
  }

  if (/\bnoite\s+(?:bem\s+)?pesada\b|\bsom\s+pesado\b|\bmusica\s+pesada\b/.test(command)) {
    return {
      intent: "agenda",
      title: "Perfeito.",
      description: `${context.city ? `Metal, doom, hardcore, punk e rock em ${context.city}.` : "Metal, doom, hardcore, punk e rock."} Queres ver o que está publicado?`,
      results: [],
      actions: [{ label: "Abrir Agenda", href: "/agenda", primary: true }],
      context: { ...context, nightStyle: "música pesada", preferredGenres: ["metal", "doom", "sludge", "hardcore", "punk", "rock"] },
    };
  }

  if (/comer pedras|beber terra|comer terra/.test(query)) {
    return {
      intent: "dining",
      title: "Isso vai dar cabo dos dentes.",
      description: context.city ? `😄\n\nMas se preferires comida a sério, estás em ${context.city}.` : "😄\n\nMas se preferires comida a sério, diz-me onde estás.",
      results: [],
      actions: [],
      context: context.city ? context : { ...context, pendingQuestion: "city", pendingIntent: "dining" },
    };
  }

  if (/nao quero ouvir\s+/.test(query)) {
    const avoided = query.replace(/^.*nao quero ouvir\s+/, "").trim().slice(0, 40);
    return {
      intent: "agenda",
      title: "Feito.",
      description: `${avoided || "Isso"} fica de fora.${context.city ? ` O que te apetece ouvir em ${context.city}?` : " Em que cidade queres procurar?"}`,
      results: [],
      actions: [],
      context: { ...context, avoidTerms: [...(context.avoidTerms || []), avoided].filter(Boolean) },
    };
  }

  const budget = extractBudget(query);
  const isBudgetStatement = budget !== null && /^(?:eu\s+)?(?:tenho|orcamento|posso gastar)\b/.test(query);
  if (isBudgetStatement) {
    return {
      intent: "unknown",
      title: `Ficam ${budget.toFixed(budget % 1 === 0 ? 0 : 2)} € como teto.`,
      description: "Queres jantar, beber qualquer coisa ou guardar parte para um concerto?",
      results: [],
      actions: [],
      context: { ...context, budgetMax: budget },
    };
  }

  return null;
}
