import assert from "node:assert/strict";
import test from "node:test";
import { buildHubResponse } from "../src/lib/hub/router.ts";

test("Hub answers absurd food requests with personality and no invented results", () => {
  const response = buildHubResponse("Quero comer pedras e beber terra", [], { authenticated: false, profileCity: null });
  assert.equal(response.title, "Para isso qualquer descampado serve");
  assert.deepEqual(response.results, []);
  assert.match(response.description, /cidade ou evento/);
});

test("Hub remembers an avoided genre only in conversation context", () => {
  const response = buildHubResponse("Não quero ouvir reggaeton", [], { authenticated: false, profileCity: null, conversation: { city: "Coimbra" } });
  assert.deepEqual(response.context?.avoidTerms, ["reggaeton"]);
  assert.match(response.description, /Coimbra/);
});

test("Hub asks for location instead of inventing dining results", () => {
  const response = buildHubResponse("Tenho fome", [], { authenticated: false, profileCity: null });
  assert.equal(response.title, "Primeiro, onde estás?");
  assert.deepEqual(response.results, []);
});

test("Hub keeps a stated budget in session context and uses it for dining", () => {
  const budgetResponse = buildHubResponse("Tenho 20 euros", [], { authenticated: false, profileCity: null });
  assert.equal(budgetResponse.context?.budgetMax, 20);

  const diningResponse = buildHubResponse("Quero jantar", [], { authenticated: false, profileCity: null, conversation: budgetResponse.context });
  assert.match(diningResponse.title, /20 €/);
  assert.equal(diningResponse.context?.budgetMax, 20);
});

test("Hub interprets a heavy night as music genres", () => {
  const event = {
    id: "event-1", slug: "doom-night", title: "Doom Night", city: "Porto", municipality: "Porto",
    venue_name: "Amplificador", display_date: "Hoje", display_time: "22:00", start_at: "2099-07-16T21:00:00Z",
    start_date: "2099-07-16", category: "Doom", price: "10 €", ticket_price: "10 €", description: "Metal e doom",
    image_url: null, featured: false,
  };
  const response = buildHubResponse("Quero uma noite pesada", [event], { authenticated: false, profileCity: null, now: new Date("2099-07-16T12:00:00Z") });
  assert.equal(response.results[0]?.id, "event-1");
  assert.deepEqual(response.context?.preferredGenres, ["metal", "hardcore", "punk", "doom", "rock"]);
  assert.match(response.description, /metal, hardcore, punk, doom e rock/);
});
