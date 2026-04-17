import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// --------------- Types ---------------

export type ReferralTier = {
  id: number;
  name: string;
  min_points: number;
  discount_percent: number;
  free_shipping: boolean;
  badge_color: string;
};

export type ReferralInfo = {
  code: string;
  totalPoints: number;
  currentTier: ReferralTier;
  nextTier: ReferralTier | null;
  tiers: ReferralTier[];
  referralCount: number;
  unlockedDiscounts: { tierName: string; discount: string }[];
};

// --------------- Helpers ---------------

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HUB-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Ensure a referral code exists for the user; returns the code string. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .single();

  if (existing) return existing.code;

  // Generate a unique code (retry on collision)
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const { error } = await supabaseAdmin
      .from("referral_codes")
      .insert({ user_id: userId, code });
    if (!error) return code;
  }
  throw new Error("Failed to generate unique referral code");
}

/** Look up the referrer's user ID from a referral code. */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code.toUpperCase().trim())
    .single();
  return data?.user_id ?? null;
}

/** Record a referral relationship and award signup points. */
export async function recordReferral(referrerId: string, referredId: string) {
  // Prevent self-referral
  if (referrerId === referredId) return;

  const { data: ref, error } = await supabaseAdmin
    .from("referrals")
    .insert({ referrer_id: referrerId, referred_id: referredId, status: "signup" })
    .select("id")
    .single();

  if (error) return; // already referred (unique constraint)

  // Award signup bonus to referrer
  await supabaseAdmin.from("referral_points").insert({
    user_id: referrerId,
    points: 100,
    reason: "referral_signup",
    referral_id: ref.id,
  });
}

/** Award purchase-conversion points to the referrer. */
export async function awardPurchasePoints(buyerUserId: string) {
  const { data: referral } = await supabaseAdmin
    .from("referrals")
    .select("id, referrer_id, status")
    .eq("referred_id", buyerUserId)
    .single();

  if (!referral || referral.status === "purchased") return;

  await supabaseAdmin
    .from("referrals")
    .update({ status: "purchased", converted_at: new Date().toISOString() })
    .eq("id", referral.id);

  await supabaseAdmin.from("referral_points").insert({
    user_id: referral.referrer_id,
    points: 250,
    reason: "referral_purchase",
    referral_id: referral.id,
  });
}

/** Fetch full referral dashboard data for a user. */
export async function getReferralInfo(userId: string): Promise<ReferralInfo> {
  const code = await getOrCreateReferralCode(userId);

  // Total points
  const { data: balRow } = await supabaseAdmin
    .from("referral_balances")
    .select("total_points")
    .eq("user_id", userId)
    .single();
  const totalPoints = balRow?.total_points ?? 0;

  // Tiers (sorted ascending)
  const { data: allTiers } = await supabaseAdmin
    .from("referral_tiers")
    .select("*")
    .order("min_points", { ascending: true });
  const tiers: ReferralTier[] = allTiers ?? [];

  // Determine current & next tier
  let currentTier = tiers[0]!;
  let nextTier: ReferralTier | null = null;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (totalPoints >= tiers[i].min_points) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] ?? null;
      break;
    }
  }

  // Count referrals
  const { count } = await supabaseAdmin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId);

  // Unlocked discounts
  const unlockedDiscounts = tiers
    .filter((t) => totalPoints >= t.min_points && t.discount_percent > 0)
    .map((t) => ({
      tierName: t.name,
      discount: t.free_shipping
        ? `${t.discount_percent}% off + Free Shipping`
        : `${t.discount_percent}% off`,
    }));

  return {
    code,
    totalPoints,
    currentTier,
    nextTier,
    tiers,
    referralCount: count ?? 0,
    unlockedDiscounts,
  };
}
