export type HubIntent = "agenda" | "nearby" | "map" | "tickets" | "shop" | "profile" | "lineup" | "dining" | "unknown";

export type HubAction = {
  label: string;
  href: string;
  primary?: boolean;
};

export type HubConversationContext = {
  eventId?: string;
  eventSlug?: string;
  eventTitle?: string;
  city?: string;
  nightStyle?: string;
  pendingQuestion?: "city" | "nightStyle" | null;
  pendingIntent?: "agenda" | "nearby" | "dining" | null;
  avoidTerms?: string[];
  preferredGenres?: string[];
  budgetMax?: number;
};

export type HubEventResult = {
  id: string;
  slug: string;
  title: string;
  displayDate: string;
  displayTime: string | null;
  venueName: string | null;
  city: string | null;
  category: string | null;
  price: string | null;
  imageUrl: string | null;
};

export type HubResponse = {
  intent: HubIntent;
  title: string;
  description: string;
  results: HubEventResult[];
  details?: Array<{
    id: string;
    title: string;
    meta: string | null;
    href?: string;
  }>;
  actions: HubAction[];
  context?: HubConversationContext;
};

export type HubHistoryItem = {
  id: string;
  query: string;
  response: HubResponse;
};
