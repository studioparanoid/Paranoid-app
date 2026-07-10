import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { addMonths } from "@/lib/billing/pricing";
import { type BillingPayment } from "@/lib/billing/types";
import { updateShopOrderStatus } from "@/lib/shop/orders";

function getEntitlementType(payment: BillingPayment) {
  if (payment.relatedType === "shop_order") {
    return "shop_order_paid";
  }

  if (payment.relatedType === "event") {
    return "event_featured";
  }

  if (
    payment.relatedType === "organizer" ||
    payment.productCode?.startsWith("organizer_pack_")
  ) {
    return "organizer_pack_active";
  }

  return "service_paid";
}

export async function activateBillingEntitlement(payment: BillingPayment) {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date();
  const entitlementType = getEntitlementType(payment);
  const relatedId = payment.relatedId;
  const endsAt =
    entitlementType === "organizer_pack_active"
      ? addMonths(now, 1)
      : entitlementType === "event_featured"
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;

  await supabase.from("billing_entitlements").insert({
    user_id: payment.userId,
    related_type: payment.relatedType || "service",
    related_id: relatedId,
    entitlement_type: entitlementType,
    starts_at: now.toISOString(),
    ends_at: endsAt?.toISOString() || null,
    status: "active",
    payment_id: payment.id,
  });

  if (payment.relatedType === "shop_order" && relatedId) {
    await updateShopOrderStatus(relatedId, "awaiting_shipment");
  }

  if (payment.relatedType === "event" && relatedId) {
    await supabase
      .from("events")
      .update({
        is_featured: true,
        featured_until: endsAt?.toISOString() || null,
        featured_payment_id: payment.id,
      })
      .eq("id", relatedId);
  }

  if (
    (payment.relatedType === "organizer" ||
      payment.productCode?.startsWith("organizer_pack_")) &&
    relatedId
  ) {
    await supabase.from("billing_subscriptions").insert({
      user_id: payment.userId,
      organizer_id: relatedId,
      plan_code: payment.productCode || "organizer_pack",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: endsAt?.toISOString() || addMonths(now, 1).toISOString(),
      payment_provider: payment.provider,
      provider_subscription_id: payment.providerReference,
    });
  }
}
