export type HubIntent = "agenda" | "nearby" | "map" | "tickets" | "shop" | "lineup" | "dining" | "unknown";

export type HubAction = {
  label: string;
  href: string;
  primary?: boolean;
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
};

export type HubHistoryItem = {
  id: string;
  query: string;
  response: HubResponse;
};
