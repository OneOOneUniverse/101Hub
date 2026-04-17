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

export type ReferredUser = {
  referred_name: string;
  status: string;
  created_at: string;
};

export type ReferralClick = {
  id: string;
  converted_name: string | null;
  converted_user_id: string | null;
  clicked_at: string;
};

export type ReferralInfo = {
  code: string;
  totalPoints: number;
  currentTier: ReferralTier;
  nextTier: ReferralTier | null;
  tiers: ReferralTier[];
  referralCount: number;
  unlockedDiscounts: { tierName: string; discount: string }[];
  referredUsers: ReferredUser[];
  // Click tracking
  totalClicks: number;
  totalConversions: number;
  recentClicks: ReferralClick[];
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

/** Record a referral relationship. Points are awarded by the DB trigger. */
export async function recordReferral(
  referrerId: string,
  referredId: string,
  referredName?: string
) {
  // Prevent self-referral
  if (referrerId === referredId) return;

  // Insert referral — the trg_award_referral_signup trigger
  // automatically awards 100 points to the referrer
  const { error } = await supabaseAdmin
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referred_name: referredName ?? "",
      status: "signup",
    });

  if (error) return; // already referred (unique constraint on referred_id)
}

/** Mark a referred user's first purchase. Points are awarded by the DB trigger. */
export async function awardPurchasePoints(buyerUserId: string) {
  // Update the status — the trg_award_referral_purchase trigger
  // automatically awards 250 points to the referrer
  await supabaseAdmin
    .from("referrals")
    .update({ status: "purchased", converted_at: new Date().toISOString() })
    .eq("referred_id", buyerUserId)
    .neq("status", "purchased");
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

  // Referral list (who this user referred)
  const { data: referralList } = await supabaseAdmin
    .from("referrals")
    .select("referred_name, status, created_at")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  const referralCount = referralList?.length ?? 0;

  // Unlocked discounts
  const unlockedDiscounts = tiers
    .filter((t) => totalPoints >= t.min_points && t.discount_percent > 0)
    .map((t) => ({
      tierName: t.name,
      discount: t.free_shipping
        ? `${t.discount_percent}% off + Free Shipping`
        : `${t.discount_percent}% off`,
    }));

  // Click tracking — fetch all clicks for this referrer
  const { data: clickRows } = await supabaseAdmin
    .from("referral_clicks")
    .select("id, converted_name, converted_user_id, clicked_at")
    .eq("referrer_user_id", userId)
    .order("clicked_at", { ascending: false })
    .limit(50);

  const allClicks = (clickRows ?? []) as ReferralClick[];
  const totalClicks = allClicks.length;
  const totalConversions = allClicks.filter((c) => c.converted_user_id !== null).length;

  return {
    code,
    totalPoints,
    currentTier,
    nextTier,
    tiers,
    referralCount,
    unlockedDiscounts,
    referredUsers: (referralList ?? []) as ReferredUser[],
    totalClicks,
    totalConversions,
    recentClicks: allClicks,
  };
}
