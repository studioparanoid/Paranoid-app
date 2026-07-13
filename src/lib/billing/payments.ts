import { calculateIncludedVat } from "@/lib/billing/pricing";
import { activateBillingEntitlement } from "@/lib/billing/entitlements";
import { buildMockProviderReference, createMockCheckout } from "@/lib/billing/mock-provider";
import { createPaymeBillingCheckout } from "@/lib/billing/payme";
import {
  type BillingCheckoutResult,
  type BillingPayment,
  type BillingPaymentDraft,
  type BillingPaymentStatus,
  type BillingProvider,
} from "@/lib/billing/types";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

type BillingProductRow = {
  code: string;
  price_cents: number;
  vat_rate: number | string | null;
  active: boolean | null;
};

type BillingPaymentRow = {
  id: string;
  user_id: string | null;
  product_code: string | null;
  related_type: string | null;
  related_id: string | null;
  amount_cents: number;
  vat_cents: number | null;
  total_cents: number;
  provider: BillingProvider | null;
  provider_reference: string | null;
  status: BillingPaymentStatus | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  paid_at: string | null;
};

function mapPayment(row: BillingPaymentRow): BillingPayment {
  return {
    id: row.id,
    userId: row.user_id,
    productCode: row.product_code,
    relatedType: row.related_type,
    relatedId: row.related_id,
    amountCents: row.amount_cents,
    vatCents: row.vat_cents ?? 0,
    totalCents: row.total_cents,
    provider: row.provider || "mock",
    providerReference: row.provider_reference,
    status: row.status || "pending",
    metadata: row.metadata || {},
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

async function getBillingProduct(code: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("billing_products")
    .select("code,price_cents,vat_rate,active")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as BillingProductRow | null;
}

export async function createBillingPayment(
  draft: BillingPaymentDraft
): Promise<BillingCheckoutResult> {
  const supabase = getRequiredSupabaseAdminClient();
  const product = await getBillingProduct(draft.productCode);

  if (!product || product.active === false) {
    throw new Error("Produto de billing indisponível.");
  }

  const totalCents = draft.amountCents ?? product.price_cents;
  const pricing = calculateIncludedVat(totalCents, Number(product.vat_rate ?? 0.23));
  const provider = draft.provider || "mock";
  const providerReference = buildMockProviderReference(
    draft.productCode.toUpperCase().replace(/[^A-Z0-9]/g, "-")
  );

  const { data, error } = await supabase
    .from("billing_payments")
    .insert({
      user_id: draft.userId || null,
      product_code: draft.productCode,
      related_type: draft.relatedType,
      related_id: draft.relatedId || null,
      amount_cents: pricing.amountCents,
      vat_cents: pricing.vatCents,
      total_cents: pricing.totalCents,
      provider,
      provider_reference: providerReference,
      status: "pending",
      metadata: draft.metadata || {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error || new Error("Não foi possível criar pagamento.");
  }

  const payment = mapPayment(data as BillingPaymentRow);

  if (provider === "payme") {
    return createPaymeBillingCheckout(payment);
  }

  return createMockCheckout(payment);
}

export async function getBillingPayments(status?: string | null) {
  const supabase = getRequiredSupabaseAdminClient();
  let query = supabase
    .from("billing_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as BillingPaymentRow[]).map(mapPayment);
}

export async function getBillingPayment(id: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("billing_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapPayment(data as BillingPaymentRow);
}

export async function updateBillingPaymentStatus(
  id: string,
  status: BillingPaymentStatus
) {
  const supabase = getRequiredSupabaseAdminClient();
  const currentPayment = await getBillingPayment(id);

  if (!currentPayment) {
    throw new Error("Pagamento não encontrado.");
  }

  if (currentPayment.status === status) {
    return currentPayment;
  }

  const updatePayload: Record<string, string | null> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "paid") {
    updatePayload.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("billing_payments")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error || new Error("Não foi possível atualizar pagamento.");
  }

  const payment = mapPayment(data as BillingPaymentRow);

  if (status === "paid" && currentPayment.status !== "paid") {
    await activateBillingEntitlement(payment);
  }

  return payment;
}
