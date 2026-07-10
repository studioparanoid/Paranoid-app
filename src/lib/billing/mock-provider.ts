import { type BillingCheckoutResult, type BillingPayment } from "@/lib/billing/types";

export function createMockCheckout(payment: BillingPayment): BillingCheckoutResult {
  return {
    payment,
    checkoutUrl: null,
    provider: "mock",
    sandbox: true,
  };
}

export function buildMockProviderReference(prefix = "MOCK") {
  return `${prefix}-${Date.now()}`;
}
