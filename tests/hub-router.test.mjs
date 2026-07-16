import assert from "node:assert/strict";
import test from "node:test";
import { buildHubResponse } from "../src/lib/hub/router.ts";
import { getHubPersonalityResponse } from "../src/lib/hub/hub-personality.js";
import { HubTimeoutError, withHubTimeout } from "../src/lib/hub/timeout.ts";

test("Hub answers absurd food requests with personality and no invented results", () => {
  const response = buildHubResponse("Quero comer pedras e beber terra", [], { authenticated: false, profileCity: null });
  assert.equal(response.title, "Isso vai dar cabo dos dentes.");
  assert.deepEqual(response.results, []);
  assert.match(response.description, /diz-me onde estás/);
});

test("local fallbacks resolve simple public commands without data", () => {
  const cases = [
    ["Agenda", "Abro-te a agenda", "/agenda"],
    ["Abrir mapa", "Vamos ver o que está perto de ti", "/mapa"],
    ["Bilhetes", "Aqui tens os teus bilhetes", "/bilhetes"],
    ["Loja", "Vamos à loja", "/loja"],
  ];
  for (const [query, title, href] of cases) {
    const response = getHubPersonalityResponse(query);
    assert.equal(response?.title, title);
    assert.equal(response?.actions[0]?.href, href);
  }
});

test("local fallback asks for location before suggesting food", () => {
  const response = getHubPersonalityResponse("Tenho fome");
  assert.equal(response?.title, "Onde estás?");
  assert.equal(response?.context?.pendingQuestion, "city");
  assert.deepEqual(response?.results, []);
});

test("Hub keeps a thirst request until the user provides a city", () => {
  const request = getHubPersonalityResponse("Estou cheio de sede");
  assert.equal(request?.intent, "dining");
  assert.equal(request?.title, "Onde estás?");
  assert.equal(request?.context?.pendingQuestion, "city");
  assert.equal(request?.context?.pendingIntent, "dining");

  const city = getHubPersonalityResponse("Pombal", request?.context);
  assert.equal(city?.intent, "dining");
  assert.equal(city?.context?.city, "Pombal");
  assert.equal(city?.context?.pendingQuestion, null);
  assert.equal(city?.context?.pendingIntent, null);
  assert.match(city?.description || "", /confirmado por perto/);
});

test("local fallback interprets a heavy night without inventing events", () => {
  const response = getHubPersonalityResponse("Quero uma noite pesada");
  assert.equal(response?.title, "Perfeito.");
  assert.match(response?.description || "", /Metal, doom, hardcore, punk e rock/);
  assert.deepEqual(response?.results, []);
});

test("Hub remembers an avoided genre only in conversation context", () => {
  const response = buildHubResponse("Não quero ouvir reggaeton", [], { authenticated: false, profileCity: null, conversation: { city: "Coimbra" } });
  assert.deepEqual(response.context?.avoidTerms, ["reggaeton"]);
  assert.match(response.description, /Coimbra/);
});

test("Hub asks for location instead of inventing dining results", () => {
  const response = buildHubResponse("Tenho fome", [], { authenticated: false, profileCity: null });
  assert.equal(response.title, "Onde estás?");
  assert.equal(response.context?.pendingQuestion, "city");
  assert.deepEqual(response.results, []);
});

test("Hub keeps a stated budget in session context and uses it for dining", () => {
  const budgetResponse = buildHubResponse("Tenho 20 euros", [], { authenticated: false, profileCity: null });
  assert.equal(budgetResponse.context?.budgetMax, 20);

  const diningResponse = buildHubResponse("Quero jantar", [], { authenticated: false, profileCity: null, conversation: budgetResponse.context });
  assert.equal(diningResponse.title, "Onde estás?");
  assert.equal(diningResponse.context?.budgetMax, 20);
  assert.equal(diningResponse.context?.pendingQuestion, "city");
});

test("Hub carries city and night preference through natural follow-up answers", () => {
  const start = getHubPersonalityResponse("Quero sair logo");
  assert.equal(start?.description, "Em que cidade estás?");
  assert.equal(start?.context?.pendingQuestion, "city");

  const city = getHubPersonalityResponse("Coimbra.", start?.context);
  assert.equal(city?.context?.city, "Coimbra");
  assert.equal(city?.context?.pendingQuestion, "nightStyle");

  const style = getHubPersonalityResponse("Metal.", city?.context);
  assert.equal(style?.context?.city, "Coimbra");
  assert.equal(style?.context?.nightStyle, "Metal");
  assert.deepEqual(style?.context?.preferredGenres, ["metal"]);
  assert.equal(style?.context?.pendingQuestion, null);

  const food = getHubPersonalityResponse("Tenho fome", style?.context);
  assert.match(food?.description || "", /Coimbra/);
});

test("Hub keeps the heavy-night meaning in conversation context", () => {
  const event = {
    id: "event-1", slug: "doom-night", title: "Doom Night", city: "Porto", municipality: "Porto",
    venue_name: "Amplificador", display_date: "Hoje", display_time: "22:00", start_at: "2099-07-16T21:00:00Z",
    start_date: "2099-07-16", category: "Doom", price: "10 €", ticket_price: "10 €", description: "Metal e doom",
    image_url: null, featured: false,
  };
  const response = buildHubResponse("Quero uma noite pesada", [event], { authenticated: false, profileCity: null, now: new Date("2099-07-16T12:00:00Z") });
  assert.deepEqual(response.results, []);
  assert.deepEqual(response.context?.preferredGenres, ["metal", "doom", "sludge", "hardcore", "punk", "rock"]);
});

test("unknown questions always receive a local response contract", () => {
  const response = buildHubResponse("Explica-me o silêncio", [], { authenticated: false, profileCity: null });
  assert.equal(response.intent, "unknown");
  assert.equal(response.results.length, 0);
  assert.ok(response.title.length > 0);
  assert.ok(response.description.length > 0);
});

test("Hub timeout rejects and does not wait for the unfinished operation", async () => {
  const operation = new Promise(() => {});
  await assert.rejects(() => withHubTimeout(operation, 5), HubTimeoutError);
});
