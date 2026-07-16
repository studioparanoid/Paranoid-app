import type { HubConversationContext, HubHistoryItem, HubIntent } from "@/lib/hub/types";

export type DiscoveryIntent = "general" | "events" | "dining" | "nearby" | "tickets" | "shop" | "community";

export type DiscoveryItemKind = "event" | "venue" | "promotion" | "product" | "community";

export type DiscoveryLocation = {
  latitude: number;
  longitude: number;
  label?: string;
  source: "manual";
};

export type DiscoveryRequest = {
  query: string;
  intent?: HubIntent;
  context?: HubConversationContext;
  location?: DiscoveryLocation;
};

export type DiscoveryAction = {
  label: string;
  href: string;
  external?: boolean;
};

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryItemKind;
  title: string;
  eyebrow: string;
  description: string;
  imageUrl: string | null;
  reason: string | null;
  meta: string[];
  primaryAction: DiscoveryAction;
  secondaryAction?: DiscoveryAction;
};

export type DiscoveryResponse = {
  heading: string;
  summary: string;
  items: DiscoveryItem[];
  signals: string[];
  personalized: boolean;
  generatedAt: string;
};

export type DiscoveryInteraction = {
  itemType: DiscoveryItemKind;
  itemId: string;
  action: "open" | "dismiss";
};

export type DiscoveryEventCandidate = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  city: string | null;
  municipality: string | null;
  district: string | null;
  venueId: string | null;
  venueName: string | null;
  organizerId: string | null;
  displayDate: string | null;
  displayTime: string | null;
  startsAt: string | null;
  category: string | null;
  price: string | null;
  ticketPrice: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  featured: boolean;
  freeEntry: boolean | null;
  latitude: number | null;
  longitude: number | null;
  hasBar: boolean;
  hasTickets: boolean;
  followedArtist: boolean;
};

export type DiscoveryVenueCandidate = {
  id: string;
  slug: string;
  name: string;
  venueType: string | null;
  shortDescription: string | null;
  description: string | null;
  city: string | null;
  municipality: string | null;
  district: string | null;
  imageUrl: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  openNow: boolean | null;
};

export type DiscoveryPromotionCandidate = {
  id: string;
  title: string;
  description: string | null;
  promotionType: string;
  endsAt: string;
  venueId: string | null;
  eventId: string | null;
  entityName: string | null;
  imageUrl: string | null;
  href: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DiscoveryProductCandidate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  finalPriceCents: number;
  stockQuantity: number;
  imageUrl: string | null;
};

export type DiscoveryCommunityCandidate = {
  id: string;
  name: string;
  communityType: string;
  shortDescription: string | null;
  city: string | null;
  municipality: string | null;
  district: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
};

export type DiscoveryRankingInput = {
  query: string;
  hubIntent?: HubIntent;
  context: HubConversationContext;
  events: DiscoveryEventCandidate[];
  venues: DiscoveryVenueCandidate[];
  promotions: DiscoveryPromotionCandidate[];
  products: DiscoveryProductCandidate[];
  communities: DiscoveryCommunityCandidate[];
  followedOrganizerIds: string[];
  followedVenueIds: string[];
  savedEventIds: string[];
  preferredCities: string[];
  preferredCategories: string[];
  favoriteGenres: string[];
  preferredPriceMax: number | null;
  preferredRadiusKm: number | null;
  location: DiscoveryLocation | null;
  interactions: DiscoveryInteraction[];
  personalized: boolean;
  now?: Date;
};

export type DiscoveryHistory = HubHistoryItem[];
