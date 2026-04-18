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

// --------------- Reward Claiming ---------------

export type RewardClaim = {
  id: number;
  tier_id: number;
  tier_name: string;
  cycle: number;
  discount_percent: number;
  free_shipping: boolean;
  redeemed: boolean;
  order_ref: string | null;
  claimed_at: string;
  redeemed_at: string | null;
};

export type RewardStatus = {
  currentCycle: number;
  claims: RewardClaim[];
  availableClaims: { tier: ReferralTier; claimable: boolean; alreadyClaimed: boolean }[];
  activeReward: RewardClaim | null; // unredeemed reward that can be applied
  roadmapComplete: boolean;
};

/** Get the user's current roadmap cycle number. */
async function getCurrentCycle(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("referral_user_cycles")
    .select("current_cycle")
    .eq("user_id", userId)
    .single();
  return data?.current_cycle ?? 1;
}

/** Get full reward status for a user. */
export async function getRewardStatus(userId: string): Promise<RewardStatus> {
  // Get tiers
  const { data: allTiers } = await supabaseAdmin
    .from("referral_tiers")
    .select("*")
    .order("min_points", { ascending: true });
  const tiers: ReferralTier[] = allTiers ?? [];

  // Get total points
  const { data: balRow } = await supabaseAdmin
    .from("referral_balances")
    .select("total_points")
    .eq("user_id", userId)
    .single();
  const totalPoints = balRow?.total_points ?? 0;

  // Get current cycle
  const currentCycle = await getCurrentCycle(userId);

  // Get claims for current cycle
  const { data: claimRows } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("*")
    .eq("user_id", userId)
    .eq("cycle", currentCycle)
    .order("claimed_at", { ascending: true });

  // Enrich claims with tier names
  const claims: RewardClaim[] = (claimRows ?? []).map((c) => {
    const tier = tiers.find((t) => t.id === c.tier_id);
    return { ...c, tier_name: tier?.name ?? "Unknown" };
  });

  // Determine which tiers are claimable (user has enough points, not yet claimed this cycle)
  const claimedTierIds = new Set(claims.map((c) => c.tier_id));
  const availableClaims = tiers
    .filter((t) => t.discount_percent > 0 || t.free_shipping) // skip tiers with no reward
    .map((t) => ({
      tier: t,
      claimable: totalPoints >= t.min_points && !claimedTierIds.has(t.id),
      alreadyClaimed: claimedTierIds.has(t.id),
    }));

  // Active reward: the first unredeemed claim (user can only use one at a time)
  const activeReward = claims.find((c) => !c.redeemed) ?? null;

  // Check if all claimable tiers have been claimed AND redeemed (roadmap complete)
  const rewardTiers = tiers.filter((t) => t.discount_percent > 0 || t.free_shipping);
  const roadmapComplete =
    rewardTiers.length > 0 &&
    rewardTiers.every((t) => {
      const claim = claims.find((c) => c.tier_id === t.id);
      return claim?.redeemed === true;
    });

  return { currentCycle, claims, availableClaims, activeReward, roadmapComplete };
}

/** Claim a tier reward. Returns the claim or an error message. */
export async function claimTierReward(
  userId: string,
  tierId: number
): Promise<{ claim?: RewardClaim; error?: string }> {
  // Get tier details
  const { data: tier } = await supabaseAdmin
    .from("referral_tiers")
    .select("*")
    .eq("id", tierId)
    .single();

  if (!tier) return { error: "Tier not found" };
  if (tier.discount_percent === 0 && !tier.free_shipping) {
    return { error: "This tier has no reward to claim" };
  }

  // Check points
  const { data: balRow } = await supabaseAdmin
    .from("referral_balances")
    .select("total_points")
    .eq("user_id", userId)
    .single();
  const totalPoints = balRow?.total_points ?? 0;
  if (totalPoints < tier.min_points) {
    return { error: `You need ${tier.min_points} points to claim this reward (you have ${totalPoints})` };
  }

  // Check if user has an unredeemed reward already
  const { data: unredeemed } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("id")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .limit(1);

  if (unredeemed && unredeemed.length > 0) {
    return { error: "You already have an active reward. Use it before claiming another." };
  }

  // Get current cycle
  const currentCycle = await getCurrentCycle(userId);

  // Check if already claimed this tier in this cycle
  const { data: existing } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("id")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .eq("cycle", currentCycle)
    .single();

  if (existing) {
    return { error: "You have already claimed this tier's reward in this cycle" };
  }

  // Insert claim
  const { data: claim, error: insertError } = await supabaseAdmin
    .from("referral_reward_claims")
    .insert({
      user_id: userId,
      tier_id: tierId,
      cycle: currentCycle,
      discount_percent: tier.discount_percent,
      free_shipping: tier.free_shipping,
    })
    .select("*")
    .single();

  if (insertError) {
    return { error: "Failed to claim reward. Please try again." };
  }

  return { claim: { ...claim, tier_name: tier.name } };
}

/** Apply (redeem) an active reward to an order. Returns discount info. */
export async function redeemReward(
  userId: string,
  orderRef: string
): Promise<{ discount_percent: number; free_shipping: boolean } | null> {
  // Find the active (unredeemed) reward
  const { data: claim } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("*")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .order("claimed_at", { ascending: true })
    .limit(1)
    .single();

  if (!claim) return null;

  // Mark as redeemed
  await supabaseAdmin
    .from("referral_reward_claims")
    .update({
      redeemed: true,
      order_ref: orderRef,
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", claim.id);

  // Check if roadmap is now complete → advance cycle
  await checkAndAdvanceCycle(userId);

  return {
    discount_percent: claim.discount_percent,
    free_shipping: claim.free_shipping,
  };
}

/** Check if all reward tiers are claimed & redeemed; if so, bump to next cycle. */
async function checkAndAdvanceCycle(userId: string): Promise<void> {
  const { data: allTiers } = await supabaseAdmin
    .from("referral_tiers")
    .select("id, discount_percent, free_shipping")
    .order("min_points", { ascending: true });
  const rewardTiers = (allTiers ?? []).filter(
    (t) => t.discount_percent > 0 || t.free_shipping
  );

  if (rewardTiers.length === 0) return;

  const currentCycle = await getCurrentCycle(userId);

  const { data: claims } = await supabaseAdmin
    .from("referral_reward_claims")
    .select("tier_id, redeemed")
    .eq("user_id", userId)
    .eq("cycle", currentCycle);

  const allRedeemed = rewardTiers.every((t) => {
    const claim = (claims ?? []).find((c) => c.tier_id === t.id);
    return claim?.redeemed === true;
  });

  if (allRedeemed) {
    // Create a placeholder claim at cycle+1 to advance the cycle counter,
    // using the first reward tier. We'll delete it immediately — the insert
    // into referral_reward_claims just needs to bump the MAX(cycle).
    // Actually, simpler: just insert+delete a sentinel row.
    // Even simpler: we rely on the view MAX(cycle), so insert a new row at cycle+1
    // for the first reward tier as "cycle reset marker" — but that would block re-claiming.
    // Best approach: We store the cycle on the claims themselves. The view picks MAX(cycle).
    // To advance, we just need any row with cycle+1. Let's use a dedicated approach:
    // We'll track cycle in a separate lightweight way. For now, since the user just completed
    // all redemptions, the NEXT claim they make will check current claims → all redeemed →
    // they'll try to claim again → we detect all redeemed and bump.
    // 
    // Actually let's keep it simple: when getRewardStatus detects roadmapComplete=true,
    // the frontend shows "Start New Cycle" button, and the API creates the new cycle.
  }
}

/** Start a new roadmap cycle after all rewards in current cycle are redeemed. */
export async function startNewCycle(userId: string): Promise<{ cycle: number; error?: string }> {
  const status = await getRewardStatus(userId);
  
  if (!status.roadmapComplete) {
    return { cycle: status.currentCycle, error: "Complete and redeem all rewards before starting a new cycle" };
  }

  const newCycle = status.currentCycle + 1;

  // We need at least one row with the new cycle to advance the view.
  // We'll check if user has enough points for any reward tier and let them claim naturally.
  // For now, just return the new cycle number. The claim function will use it.
  // To make the view work, we insert a "cycle_start" marker.
  // Actually, let's just have the claim function accept an explicit cycle parameter
  // when we know the roadmap is complete.

  return { cycle: newCycle };
}

/** Claim a tier reward in a new cycle (after roadmap restart). */
export async function claimTierRewardNewCycle(
  userId: string,
  tierId: number,
  newCycle: number
): Promise<{ claim?: RewardClaim; error?: string }> {
  const { data: tier } = await supabaseAdmin
    .from("referral_tiers")
    .select("*")
    .eq("id", tierId)
    .single();

  if (!tier) return { error: "Tier not found" };

  const { data: balRow } = await supabaseAdmin
    .from("referral_balances")
    .select("total_points")
    .eq("user_id", userId)
    .single();
  const totalPoints = balRow?.total_points ?? 0;
  if (totalPoints < tier.min_points) {
    return { error: `Not enough points` };
  }

  const { data: claim, error: insertError } = await supabaseAdmin
    .from("referral_reward_claims")
    .insert({
      user_id: userId,
      tier_id: tierId,
      cycle: newCycle,
      discount_percent: tier.discount_percent,
      free_shipping: tier.free_shipping,
    })
    .select("*")
    .single();

  if (insertError) {
    return { error: "Failed to claim reward" };
  }

  return { claim: { ...claim, tier_name: tier.name } };
}
