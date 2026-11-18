import type { AccountType } from "./api";

export type PlanSelection = {
  accountType: AccountType;
  tierLevel?: number;
  label: string;
};

/** Map marketing pricing plan ids / query aliases to backend account types. */
export function planFromQuery(
  plan?: string | null,
  tier?: string | null,
): PlanSelection {
  const raw = String(plan ?? "")
    .trim()
    .toLowerCase()
    .replace(/[+\s]/g, "_");

  if (
    raw === "exclusive" ||
    raw === "individual" ||
    raw === "communal" ||
    raw === "free"
  ) {
    return {
      accountType: "EXCLUSIVE",
      label: "Individual",
    };
  }

  if (
    raw === "enhanced" ||
    raw === "individual_pro" ||
    raw === "individual-pro" ||
    raw === "pro"
  ) {
    return {
      accountType: "ENHANCED",
      label: "Individual Pro",
    };
  }

  if (
    raw === "private_plus" ||
    raw === "private+" ||
    raw === "family" ||
    raw === "privateplus"
  ) {
    return {
      accountType: "PRIVATE_PLUS",
      label: "Family",
    };
  }

  const orgMatch = raw.match(/^org[-_]?(\d)$/);
  if (orgMatch || raw === "enhanced_plus" || raw === "organization") {
    const fromTier = Number(tier);
    const fromPlan = orgMatch ? Number(orgMatch[1]) : NaN;
    const level = [fromTier, fromPlan].find(
      (n) => Number.isFinite(n) && n >= 1 && n <= 5,
    );
    return {
      accountType: "ENHANCED_PLUS",
      tierLevel: level ?? 1,
      label: `Organization ${level ?? 1}`,
    };
  }

  return {
    accountType: "EXCLUSIVE",
    label: "Individual",
  };
}

/** Marketing plan card ids → Stripe /subscription plan_key values. */
export function checkoutPlanKeyForPricingId(planId: string): string | null {
  switch (planId) {
    case "individual-pro":
      return "enhanced";
    case "family":
      return "private_plus";
    case "org-1":
      return "enhanced_plus_1";
    case "org-2":
      return "enhanced_plus_2";
    case "org-3":
      return "enhanced_plus_3";
    case "org-4":
      return "enhanced_plus_4";
    case "org-5":
      return "enhanced_plus_5";
    default:
      return null;
  }
}

/** CTA target for pricing cards — subscribe after sign-in. */
export function pricingCtaPathForPlan(planId: string): string {
  const key = checkoutPlanKeyForPricingId(planId);
  if (!key) return "/register";
  return `/pricing?plan=${encodeURIComponent(planId)}`;
}

/** @deprecated Prefer pricingCtaPathForPlan — signup is Individual-only. */
export function registerPathForPlan(planId: string): string {
  return pricingCtaPathForPlan(planId);
}
