export type BillingProductType =
  | "shop_order"
  | "event_feature"
  | "organizer_pack"
  | "subscription"
  | "service";

export type BillingPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type BillingProvider = "mock" | "payme";

export type BillingPayment = {
  id: string;
  userId: string | null;
  productCode: string | null;
  relatedType: string | null;
  relatedId: string | null;
  amountCents: number;
  vatCents: number;
  totalCents: number;
  provider: BillingProvider;
  providerReference: string | null;
  status: BillingPaymentStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  paidAt: string | null;
};

export type BillingPaymentDraft = {
  userId?: string | null;
  productCode: string;
  relatedType: "shop_order" | "event" | "organizer" | "subscription" | "service";
  relatedId?: string | null;
  amountCents?: number;
  provider?: BillingProvider;
  metadata?: Record<string, unknown>;
};

export type BillingCheckoutResult = {
  payment: BillingPayment;
  checkoutUrl: string | null;
  provider: BillingProvider;
  sandbox: boolean;
};
