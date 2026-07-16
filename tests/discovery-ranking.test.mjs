import assert from "node:assert/strict";
import test from "node:test";
import { classifyDiscoveryIntent, rankDiscoveryContent } from "../src/lib/discovery/ranking.ts";

const now = new Date("2030-06-10T12:00:00Z");

function event(overrides = {}) {
  return {
    id: "event-1",
    slug: "evento-1",
    title: "Concerto independente",
    shortDescription: null,
    description: null,
    city: "Pombal",
    municipality: "Pombal",
    district: "Leiria",
    venueId: "venue-1",
    venueName: "Espaço publicado",
    organizerId: "organizer-1",
    displayDate: "15 jun",
    displayTime: "21:30",
    startsAt: "2030-06-15T20:30:00Z",
    category: "Rock",
    price: "10 €",
    ticketPrice: null,
    imageUrl: null,
    coverImageUrl: null,
    featured: false,
    freeEntry: false,
    latitude: 39.91,
    longitude: -8.63,
    hasBar: false,
    hasTickets: false,
    followedArtist: false,
    ...overrides,
  };
}

function venue(overrides = {}) {
  return {
    id: "venue-1",
    slug: "espaco-publicado",
    name: "Espaço publicado",
    venueType: "bar",
    shortDescription: "Bar com programação cultural.",
    description: null,
    city: "Pombal",
    municipality: "Pombal",
    district: "Leiria",
    imageUrl: null,
    coverUrl: null,
    logoUrl: null,
    latitude: 39.91,
    longitude: -8.63,
    openNow: true,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    query: "",
    context: {},
    events: [],
    venues: [],
    promotions: [],
    products: [],
    communities: [],
    followedOrganizerIds: [],
    followedVenueIds: [],
    savedEventIds: [],
    preferredCities: [],
    preferredCategories: [],
    favoriteGenres: [],
    preferredPriceMax: null,
    preferredRadiusKm: null,
    location: null,
    interactions: [],
    personalized: false,
    now,
    ...overrides,
  };
}

test("Discovery classifies natural thirst as dining", () => {
  assert.equal(classifyDiscoveryIntent("Estou cheio de sede"), "dining");
  const withoutArea = rankDiscoveryContent(input({ query: "Estou cheio de sede" }));
  assert.equal(withoutArea.heading, "O que está confirmado");
});

test("saved and followed signals outrank a generic featured event", () => {
  const result = rankDiscoveryContent(input({
    query: "próximos concertos",
    hubIntent: "agenda",
    events: [
      event({ id: "featured", slug: "featured", title: "Evento em destaque", featured: true }),
      event({ id: "saved", slug: "saved", title: "Evento guardado", organizerId: "followed" }),
    ],
    followedOrganizerIds: ["followed"],
    savedEventIds: ["saved"],
    personalized: true,
  }));
  assert.equal(result.items[0]?.id, "saved");
  assert.equal(result.items[0]?.reason, "Guardaste este evento");
});

test("dining results only expose confirmed active data", () => {
  const result = rankDiscoveryContent(input({
    query: "tenho sede",
    context: { city: "Pombal" },
    events: [event({ hasBar: true })],
    venues: [venue()],
    promotions: [{
      id: "promotion-1",
      title: "Happy hour publicado",
      description: null,
      promotionType: "happy_hour",
      endsAt: "2030-06-10T18:00:00Z",
      venueId: "venue-1",
      eventId: null,
      entityName: "Espaço publicado",
      imageUrl: null,
      href: "/espacos/espaco-publicado",
      city: "Pombal",
      latitude: 39.91,
      longitude: -8.63,
    }],
  }));
  assert.ok(result.items.some((item) => item.kind === "venue" && item.meta.includes("Aberto agora")));
  assert.ok(result.items.some((item) => item.kind === "promotion" && item.reason === "Está ativa neste momento"));
  assert.ok(result.items.some((item) => item.kind === "event" && item.meta.includes("Bar confirmado")));
});

test("budget context removes events with a confirmed price above the limit", () => {
  const result = rankDiscoveryContent(input({
    query: "concertos",
    hubIntent: "agenda",
    context: { budgetMax: 12 },
    events: [event({ id: "cheap", slug: "cheap", price: "10 €" }), event({ id: "expensive", slug: "expensive", price: "30 €" })],
  }));
  assert.deepEqual(result.items.map((item) => item.id), ["cheap"]);
});

test("manual map location and radius exclude distant results", () => {
  const result = rankDiscoveryContent(input({
    query: "perto de mim",
    hubIntent: "nearby",
    events: [event({ id: "near", slug: "near" }), event({ id: "far", slug: "far", latitude: 41.15, longitude: -8.61 })],
    location: { latitude: 39.91, longitude: -8.63, source: "manual", label: "Pombal" },
    preferredRadiusKm: 25,
  }));
  assert.deepEqual(result.items.map((item) => item.id), ["near"]);
  assert.ok(result.items[0]?.meta.some((value) => value.endsWith("m") || value.endsWith("km")));
});

test("dismissed content is not returned by the ranking", () => {
  const result = rankDiscoveryContent(input({
    query: "concertos",
    hubIntent: "agenda",
    events: [event()],
    interactions: [{ itemType: "event", itemId: "event-1", action: "dismiss" }],
  }));
  assert.deepEqual(result.items, []);
});
