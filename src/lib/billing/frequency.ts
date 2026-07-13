import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { type BillingPayment } from "@/lib/billing/types";

export const FREQUENCY_PRODUCT_CODE = "organizer_paranoid_frequency";
export const FREQUENCY_ENTITLEMENT_TYPE = "organizer_frequency_active";
export const FREQUENCY_DURATION_DAYS = 30;

export type OrganizerVisibilityPassStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled";

export type OrganizerVisibilityPass = {
  id: string;
  organizerId: string;
  userId: string | null;
  productCode: string;
  paymentId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: OrganizerVisibilityPassStatus;
  autoFeatureEvents: boolean;
  homepageEligible: boolean;
  agendaPriority: number;
  mapPriority: number;
  editorialInclusion: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type OrganizerVisibilityPassRow = {
  id: string;
  organizer_id: string;
  user_id: string | null;
  product_code: string | null;
  payment_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: OrganizerVisibilityPassStatus | null;
  auto_feature_events: boolean | null;
  homepage_eligible: boolean | null;
  agenda_priority: number | null;
  map_priority: number | null;
  editorial_inclusion: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const PASS_SELECT =
  "id,organizer_id,user_id,product_code,payment_id,starts_at,ends_at,status,auto_feature_events,homepage_eligible,agenda_priority,map_priority,editorial_inclusion,created_at,updated_at";

type EventVisibilityInput = {
  organizer_id?: string | null;
  organizerId?: string | null;
  status?: string | null;
  featured?: boolean | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
};

function addFrequencyDays(date: Date) {
  return new Date(date.getTime() + FREQUENCY_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

function mapPass(row: OrganizerVisibilityPassRow): OrganizerVisibilityPass {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    userId: row.user_id,
    productCode: row.product_code || FREQUENCY_PRODUCT_CODE,
    paymentId: row.payment_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status || "pending",
    autoFeatureEvents: row.auto_feature_events ?? true,
    homepageEligible: row.homepage_eligible ?? true,
    agendaPriority: row.agenda_priority ?? 1,
    mapPriority: row.map_priority ?? 1,
    editorialInclusion: row.editorial_inclusion ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPassByPayment(paymentId: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .select(PASS_SELECT)
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPass(data as OrganizerVisibilityPassRow) : null;
}

export async function getActiveOrganizerFrequencyPass(organizerId: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .select(PASS_SELECT)
    .eq("organizer_id", organizerId)
    .eq("status", "active")
    .gt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPass(data as OrganizerVisibilityPassRow) : null;
}

export async function activateOrganizerFrequencyPass(payment: BillingPayment) {
  if (payment.productCode !== FREQUENCY_PRODUCT_CODE) {
    return null;
  }

  if (!payment.relatedId) {
    throw new Error("Frequency precisa de um ID de organizador.");
  }

  if (payment.id) {
    const existingPaymentPass = await getPassByPayment(payment.id);

    if (existingPaymentPass?.status === "active") {
      return existingPaymentPass;
    }
  }

  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date();
  const activePass = await getActiveOrganizerFrequencyPass(payment.relatedId);
  const currentEnd = activePass?.endsAt ? new Date(activePass.endsAt) : null;
  const baseDate = currentEnd && currentEnd > now ? currentEnd : now;
  const startsAt = activePass?.startsAt || now.toISOString();
  const endsAt = addFrequencyDays(baseDate).toISOString();

  if (activePass) {
    const { data, error } = await supabase
      .from("organizer_visibility_passes")
      .update({
        user_id: payment.userId,
        payment_id: activePass.paymentId || payment.id,
        ends_at: endsAt,
        status: "active",
        updated_at: now.toISOString(),
      })
      .eq("id", activePass.id)
      .select(PASS_SELECT)
      .single();

    if (error || !data) {
      throw error || new Error("Não foi possível renovar Frequency.");
    }

    await upsertFrequencyEntitlement(payment, startsAt, endsAt);
    return mapPass(data as OrganizerVisibilityPassRow);
  }

  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .insert({
      organizer_id: payment.relatedId,
      user_id: payment.userId,
      product_code: FREQUENCY_PRODUCT_CODE,
      payment_id: payment.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "active",
      auto_feature_events: true,
      homepage_eligible: true,
      agenda_priority: 1,
      map_priority: 1,
      editorial_inclusion: true,
    })
    .select(PASS_SELECT)
    .single();

  if (error || !data) {
    throw error || new Error("Não foi possível ativar Frequency.");
  }

  await upsertFrequencyEntitlement(payment, startsAt, endsAt);
  return mapPass(data as OrganizerVisibilityPassRow);
}

async function upsertFrequencyEntitlement(
  payment: BillingPayment,
  startsAt: string,
  endsAt: string
) {
  const supabase = getRequiredSupabaseAdminClient();

  await supabase.from("billing_entitlements").insert({
    user_id: payment.userId,
    related_type: "organizer",
    related_id: payment.relatedId,
    entitlement_type: FREQUENCY_ENTITLEMENT_TYPE,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "active",
    payment_id: payment.id,
  });
}

export async function getOrganizerVisibilityStatus(organizerId: string) {
  const pass = await getActiveOrganizerFrequencyPass(organizerId);
  const now = new Date();
  const endsAt = pass?.endsAt ? new Date(pass.endsAt) : null;
  const daysRemaining =
    endsAt && endsAt > now
      ? Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

  return {
    active: Boolean(pass && daysRemaining > 0),
    pass,
    daysRemaining,
  };
}

export async function hasActiveFrequencyPass(organizerId: string) {
  const status = await getOrganizerVisibilityStatus(organizerId);

  return status.active;
}

export async function getEventVisibilityPriority(event: EventVisibilityInput) {
  const published = event.status === "published" || event.status === "approved";
  const featuredUntil = event.featured_until ? new Date(event.featured_until) : null;
  const hasPaidFeature =
    (event.is_featured || event.featured) &&
    (!featuredUntil || featuredUntil.getTime() > Date.now());

  if (hasPaidFeature) {
    return {
      priority: 2,
      source: "paid_feature" as const,
      label: "Destaque pago",
    };
  }

  const organizerId = event.organizer_id || event.organizerId;

  if (published && organizerId && (await hasActiveFrequencyPass(organizerId))) {
    return {
      priority: 1,
      source: "frequency" as const,
      label: "Frequency",
    };
  }

  return {
    priority: 0,
    source: "normal" as const,
    label: "Normal",
  };
}

export async function getEligibleOrganizerEvents(organizerId: string) {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,slug,status,start_at,city,venue_name,organizer_id")
    .eq("organizer_id", organizerId)
    .in("status", ["published", "approved"])
    .order("start_at", { ascending: true })
    .limit(100);

  if (error) {
    return [];
  }

  return data || [];
}

export async function getOrganizerFrequencyPasses() {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .select(PASS_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return [];
  }

  return (data as OrganizerVisibilityPassRow[]).map(mapPass);
}

export async function expireOrganizerFrequencyPasses() {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("ends_at", now)
    .select(PASS_SELECT);

  if (error) {
    throw error;
  }

  await supabase
    .from("billing_entitlements")
    .update({ status: "expired", updated_at: now })
    .eq("entitlement_type", FREQUENCY_ENTITLEMENT_TYPE)
    .eq("status", "active")
    .lt("ends_at", now);

  return (data || []).map((row) => mapPass(row as OrganizerVisibilityPassRow));
}

export async function updateOrganizerFrequencyPass(
  passId: string,
  updates: Partial<{
    status: OrganizerVisibilityPassStatus;
    endsAt: string;
  }>
) {
  const supabase = getRequiredSupabaseAdminClient();
  const payload: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    payload.status = updates.status;
  }

  if (updates.endsAt) {
    payload.ends_at = updates.endsAt;
  }

  const { data, error } = await supabase
    .from("organizer_visibility_passes")
    .update(payload)
    .eq("id", passId)
    .select(PASS_SELECT)
    .single();

  if (error || !data) {
    throw error || new Error("Não foi possível atualizar Frequency.");
  }

  return mapPass(data as OrganizerVisibilityPassRow);
}
