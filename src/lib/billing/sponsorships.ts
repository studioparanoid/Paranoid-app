import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { type BillingPayment } from "@/lib/billing/types";

export const SIGNAL_PRODUCT_CODE = "paranoid_signal";
export const NOISE_PRODUCT_CODE = "paranoid_noise";
export const HEADLINER_PRODUCT_CODE = "paranoid_headliner";

type SponsorshipConfig = {
  durationDays: number;
  placements: string[];
  sponsoredPostLimit: number;
};

const SPONSORSHIP_CONFIG: Record<string, SponsorshipConfig> = {
  [SIGNAL_PRODUCT_CODE]: {
    durationDays: 90,
    placements: ["partners"],
    sponsoredPostLimit: 0,
  },
  [NOISE_PRODUCT_CODE]: {
    durationDays: 180,
    placements: ["home", "agenda", "map", "region"],
    sponsoredPostLimit: 3,
  },
  [HEADLINER_PRODUCT_CODE]: {
    durationDays: 365,
    placements: ["home", "agenda", "map", "region", "partners"],
    sponsoredPostLimit: 10,
  },
};

const SPONSORSHIP_SELECT =
  "id,user_id,sponsor_id,product_code,payment_id,starts_at,ends_at,status,sponsored_post_limit,sponsored_posts_used,founding_partner_number,created_at,updated_at";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isSponsorshipProduct(productCode: string | null | undefined) {
  return Boolean(productCode && SPONSORSHIP_CONFIG[productCode]);
}

export async function activateSponsorship(payment: BillingPayment) {
  if (!payment.productCode || !isSponsorshipProduct(payment.productCode)) {
    return null;
  }

  const supabase = getRequiredSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("sponsorship_campaigns")
    .select(SPONSORSHIP_SELECT)
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const config = SPONSORSHIP_CONFIG[payment.productCode];
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = addDays(now, config.durationDays).toISOString();
  let foundingPartnerNumber: number | null = null;

  if (payment.productCode === HEADLINER_PRODUCT_CODE) {
    const { data: existingFounders } = await supabase
      .from("sponsorship_campaigns")
      .select("founding_partner_number")
      .not("founding_partner_number", "is", null)
      .order("founding_partner_number", { ascending: true });

    const usedNumbers = new Set(
      (existingFounders || [])
        .map((row) => Number(row.founding_partner_number))
        .filter((value) => value > 0)
    );

    for (let number = 1; number <= 10; number += 1) {
      if (!usedNumbers.has(number)) {
        foundingPartnerNumber = number;
        break;
      }
    }
  }

  const { data: campaign, error } = await supabase
    .from("sponsorship_campaigns")
    .insert({
      user_id: payment.userId,
      sponsor_id: payment.relatedId,
      product_code: payment.productCode,
      payment_id: payment.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "active",
      sponsored_post_limit: config.sponsoredPostLimit,
      sponsored_posts_used: 0,
      founding_partner_number: foundingPartnerNumber,
    })
    .select(SPONSORSHIP_SELECT)
    .single();

  if (error || !campaign) {
    throw error || new Error("Não foi possível ativar patrocínio.");
  }

  await Promise.all(
    config.placements.map((placement) =>
      supabase.from("sponsorship_placements").insert({
        campaign_id: campaign.id,
        placement,
        status: "active",
        starts_at: startsAt,
        ends_at: endsAt,
      })
    )
  );

  await supabase.from("billing_entitlements").insert({
    user_id: payment.userId,
    related_type: "sponsorship",
    related_id: campaign.id,
    entitlement_type: `${payment.productCode}_active`,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "active",
    payment_id: payment.id,
  });

  return campaign;
}

export async function getActiveSponsorshipCampaigns() {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sponsorship_campaigns")
    .select(SPONSORSHIP_SELECT)
    .eq("status", "active")
    .gt("ends_at", now)
    .order("founding_partner_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getAllSponsorshipCampaigns() {
  const supabase = getRequiredSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sponsorship_campaigns")
    .select(SPONSORSHIP_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return [];
  }

  return data;
}

export async function expireSponsorships() {
  const supabase = getRequiredSupabaseAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("sponsorship_campaigns")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("ends_at", now);

  await supabase
    .from("sponsorship_placements")
    .update({ status: "inactive", updated_at: now })
    .eq("status", "active")
    .lt("ends_at", now);

  await supabase
    .from("billing_entitlements")
    .update({ status: "expired", updated_at: now })
    .like("entitlement_type", "paranoid_%_active")
    .eq("status", "active")
    .lt("ends_at", now);
}
