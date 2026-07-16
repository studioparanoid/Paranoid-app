export type DataSource =
  | "paranoid_admin"
  | "organizer"
  | "venue"
  | "artist"
  | "community"
  | "integration"
  | "public_submission"
  | "imported"
  | "inferred"
  | "legacy"
  | "unknown";

export type ToolResult<T> = {
  data: T;
  source: DataSource;
  lastUpdatedAt: string | null;
  isLive: boolean;
};

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  eventType: string | null;
  startsAt: string | null;
  endsAt: string | null;
  displayDate: string | null;
  displayTime: string | null;
  venueName: string | null;
  city: string | null;
  freeEntry: boolean | null;
  legacyPrice: string | null;
};

export type ProgramItem = {
  id: string;
  eventId: string;
  dayId: string | null;
  zoneId: string | null;
  zoneName: string | null;
  title: string;
  programType: string;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: string;
  delayMinutes: number;
  artists: Array<{ id: string; slug: string; name: string; role: string | null }>;
};

export type EventZone = {
  id: string;
  name: string;
  slug: string;
  zoneType: string;
  parentZoneId: string | null;
  mapLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  mapX: number | null;
  mapY: number | null;
  accessible: boolean;
};

export type FoodOption = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorType: string;
  zoneId: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  available: boolean;
  soldOut: boolean;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  allergenInformationConfirmed: boolean;
  estimatedWaitMinutes: number | null;
};

export type ActivePromotion = {
  id: string;
  title: string;
  description: string | null;
  promotionType: string;
  startsAt: string;
  endsAt: string;
  vendorId: string | null;
  terms: string | null;
};

export type EventService = {
  id: string;
  serviceType: string;
  name: string;
  description: string | null;
  zoneId: string | null;
  accessible: boolean;
  status: string;
  opensAt: string | null;
  closesAt: string | null;
};

export type TransportRoute = {
  id: string;
  transportType: string;
  operatorName: string | null;
  originName: string;
  destinationName: string;
  accessible: boolean;
  reservationRequired: boolean;
  reservationUrl: string | null;
  priceAmount: number | null;
  currency: string;
  departures: Array<{
    id: string;
    scheduledDepartureAt: string;
    actualDepartureAt: string | null;
    scheduledArrivalAt: string | null;
    status: string;
    availableCapacity: number | null;
    liveNotes: string | null;
  }>;
};

export type LiveStatus = {
  id: string;
  targetType: string;
  targetId: string | null;
  statusType: string;
  statusValue: string | null;
  message: string | null;
  severity: string;
  startsAt: string;
  expiresAt: string;
  verified: boolean;
};

export type EventTicket = {
  id: string;
  name: string;
  description: string | null;
  productType: string;
  priceAmount: number | null;
  currency: string;
  serviceFeeAmount: number;
  availableCapacity: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  channelName: string | null;
  channelType: string | null;
  purchaseUrl: string | null;
};
