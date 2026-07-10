import { type BillingCheckoutResult, type BillingPayment } from "@/lib/billing/types";

export function hasPaymeBillingConfig() {
  return Boolean(
    process.env.PAYME_MERCHANT_ID &&
      process.env.PAYME_TERMINAL_ID &&
      process.env.PAYME_API_KEY &&
      process.env.PAYME_WEBHOOK_SECRET &&
      process.env.PAYME_ENV
  );
}

export async function createPaymeBillingCheckout(
  payment: BillingPayment
): Promise<BillingCheckoutResult> {
  // TODO: ligar à API Pay.Me real quando houver credenciais finais e endpoints
  // oficiais. A Paranoid nunca deve guardar dados de cartão.
  return {
    payment,
    checkoutUrl: null,
    provider: "payme",
    sandbox: !hasPaymeBillingConfig(),
  };
}

export async function handlePaymeWebhook() {
  // TODO: validar PAYME_WEBHOOK_SECRET, mapear provider_reference e confirmar
  // pagamentos com activateBillingPayment().
  return { received: true, provider: "payme", implemented: false };
}
