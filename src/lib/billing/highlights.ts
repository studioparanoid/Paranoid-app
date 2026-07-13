import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { type BillingPayment } from "@/lib/billing/types";

export const EVENT_FEATURE_PRODUCT_CODE = "event_feature_basic";
export const EVENT_FEATURE_PACK_PRODUCT_CODE = "event_feature_pack_3";
export const EVENT_FEATURE_ENTITLEMENT_TYPE = "event_featured";
export const EVENT_FEATURE_PACK_ENTITLEMENT_TYPE = "event_feature_pack_active";
export const EVENT_FEATURE_DAYS = 7;
export const EVENT_FEATURE_PACK_CREDITS = 3;

const CREDIT_PACK_SELECT =
  "id,organizer_id,user_id,payment_id,total_credits,remaining_credits,status,starts_at,expires_at,created_at,updated_at";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function activateEventFeature(payment: BillingPayment) {
  if (!payment.relatedId) {
    throw new Error("Destaque precisa de um ID de evento.");
  }

  const supabase = getRequiredSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("billing_entitlements")
    .select("id")
    .eq("payment_id", payment.id)
    .eq("entitlement_type", EVENT_FEATURE_ENTITLEMENT_TYPE)
    .maybeSingle();

  if (existing) {
    return;
  }

  const now = new Date();
  const endsAt = addDays(now, EVENT_FEATURE_DAYS).toISOString();

  await supabase.from("billing_entitlements").insert({
    user_id: payment.userId,
    related_type: "event",
    related_id: payment.relatedId,
    entitlement_type: EVENT_FEATURE_ENTITLEMENT_TYPE,
    starts_at: now.toISOString(),
    ends_at: endsAt,
    status: "active",
    payment_id: payment.id,
  });

  await supabase
    .from("events")
    .update({
      is_featured: true,
      featured: true,
      featured_until: endsAt,
      featured_payment_id: payment.id,
    })
    .eq("id", payment.relatedId);
}

export async function activateEventFeaturePack(payment: BillingPayment) {
  const supabase = getRequiredSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("event_highlight_credit_packs")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const now = new Date();
  const expiresAt = addDays(now, 90).toISOString();
  const { data, error } = await supabase
    .from("event_highlight_credit_packs")
    .insert({
      organizer_id: payment.relatedId,
      user_id: payment.userId,
      payment_id: payment.id,
      total_credits: EVENT_FEATURE_PACK_CREDITS,
      remaining_credits: EVENT_FEATURE_PACK_CREDITS,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select(CREDIT_PACK_SELECT)
    .single();

  if (error || !data) {
    throw error || new Error("Não foi possível criar créditos.");
  }

  await supabase.from("billing_entitlements").insert({
    user_id: payment.userId,
    related_type: "organizer",
    related_id: payment.relatedId,
    entitlement_type: EVENT_FEATURE_PACK_ENTITLEMENT_TYPE,
    starts_at: now.toISOString(),
    ends_at: expiresAt,
    status: "active",
    payment_id: payment.id,
  });

  return data;
}

export async function consumeEventHighlightCredit({
  organizerId,
  eventId,
  userId,
}: {
  organizerId: string;
  eventId: string;
  userId: string | null;
}) {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date();

  const { data: alreadyUsed } = await supabase
    .from("event_highlight_credit_uses")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (alreadyUsed) {
    return { used: false, reason: "already_featured" };
  }

  const { data: pack, error } = await supabase
    .from("event_highlight_credit_packs")
    .select(CREDIT_PACK_SELECT)
    .eq("organizer_id", organizerId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .gt("remaining_credits", 0)
    .order("expires_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!pack) {
    return { used: false, reason: "no_credits" };
  }

  const endsAt = addDays(now, EVENT_FEATURE_DAYS).toISOString();
  const { error: useError } = await supabase
    .from("event_highlight_credit_uses")
    .insert({
      credit_pack_id: pack.id,
      event_id: eventId,
      organizer_id: organizerId,
      user_id: userId,
      used_at: now.toISOString(),
      featured_until: endsAt,
    });

  if (useError) {
    return { used: false, reason: "already_featured" };
  }

  await supabase
    .from("event_highlight_credit_packs")
    .update({
      remaining_credits: Math.max(0, Number(pack.remaining_credits || 0) - 1),
      updated_at: now.toISOString(),
    })
    .eq("id", pack.id)
    .gt("remaining_credits", 0);

  await supabase
    .from("events")
    .update({
      is_featured: true,
      featured: true,
      featured_until: endsAt,
    })
    .eq("id", eventId)
    .eq("organizer_id", organizerId);

  return { used: true, remainingCredits: Number(pack.remaining_credits || 0) - 1 };
}

export async function getActiveEventHighlightCreditPacks(organizerId: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_highlight_credit_packs")
    .select(CREDIT_PACK_SELECT)
    .eq("organizer_id", organizerId)
    .eq("status", "active")
    .gt("expires_at", now)
    .order("expires_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function expireEventHighlightProducts() {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("events")
    .update({ is_featured: false, featured: false })
    .lt("featured_until", now);

  await supabase
    .from("event_highlight_credit_packs")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now);

  await supabase
    .from("billing_entitlements")
    .update({ status: "expired", updated_at: now })
    .in("entitlement_type", [
      EVENT_FEATURE_ENTITLEMENT_TYPE,
      EVENT_FEATURE_PACK_ENTITLEMENT_TYPE,
    ])
    .eq("status", "active")
    .lt("ends_at", now);
}
