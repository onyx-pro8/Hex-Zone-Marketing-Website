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

export function registerPathForPlan(planId: string): string {
  switch (planId) {
    case "individual-pro":
      return "/register?plan=individual-pro";
    case "family":
      return "/register?plan=family";
    case "org-1":
      return "/register?plan=org-1";
    case "org-2":
      return "/register?plan=org-2";
    case "org-3":
      return "/register?plan=org-3";
    case "org-4":
      return "/register?plan=org-4";
    case "org-5":
      return "/register?plan=org-5";
    default:
      return "/register";
  }
}
