export type BillingInterval = "monthly" | "annual";

export type PricingPlan = {
  id: string;
  name: string;
  blurb: string;
  usersLabel: string;
  monthlyPrice: number | null;
  annualTotal: number | null;
  features: string[];
  quotas: { label: string; value: string }[] | null;
  popular?: boolean;
  ctaLabel: string;
  ctaHref?: string;
};

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Public paid catalog aligned with server `plan_entitlements.PLAN_CATALOG`.
 * Feature bullets and quotas are limited to capabilities the app actually meters or ships.
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "individual-pro",
    name: "Individual Pro",
    blurb: "Solo administrator with zones, alerts, guest tools, and API access.",
    usersLabel: "1 active user",
    monthlyPrice: 4.99,
    annualTotal: 29.88,
    features: [
      "GPS tracking",
      "Geofencing & zones",
      "Emergency alerts",
      "Maps",
      "Mobile app",
      "Guest access & passes",
      "REST API",
    ],
    quotas: [
      { label: "Members", value: "1" },
      { label: "Smart-home hubs", value: "1" },
      { label: "Messages / mo", value: fmt(1000) },
      { label: "History retention", value: "30 days" },
      { label: "Universal Access keys", value: "1" },
      { label: "Access QR / mo", value: "10" },
      { label: "Guest call minutes / mo", value: "60" },
      { label: "API calls / mo", value: fmt(25000) },
      { label: "Location updates / mo", value: fmt(10000) },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "family",
    name: "Family",
    blurb: "Share zones, members, and alerts across a household network.",
    usersLabel: "Up to 10 users",
    monthlyPrice: 9.99,
    annualTotal: 95.88,
    features: [
      "Member network sharing",
      "GPS tracking",
      "Geofencing & zones",
      "Emergency alerts",
      "Guest access & passes",
      "Smart-home hubs",
      "REST API",
    ],
    quotas: [
      { label: "Members", value: "10" },
      { label: "Smart-home hubs", value: "10" },
      { label: "Messages / mo", value: fmt(5000) },
      { label: "History retention", value: "90 days" },
      { label: "Universal Access keys", value: "3" },
      { label: "Access QR / mo", value: "50" },
      { label: "Guest call minutes / mo", value: "300" },
      { label: "API calls / mo", value: fmt(100000) },
      { label: "Location updates / mo", value: fmt(50000) },
    ],
    popular: true,
    ctaLabel: "Get Started",
  },
  {
    id: "org-1",
    name: "Organization 1",
    blurb: "Admin dashboard and core ops tooling for small teams.",
    usersLabel: "Up to 20 users",
    monthlyPrice: 59.9,
    annualTotal: 598.8,
    features: [
      "Admin dashboard",
      "GPS tracking",
      "Geofencing & zones",
      "Emergency alerts",
      "Guest access & passes",
      "Smart-home hubs",
      "REST API",
    ],
    quotas: [
      { label: "Members", value: "20" },
      { label: "Smart-home hubs", value: "25" },
      { label: "Messages / mo", value: fmt(25000) },
      { label: "History retention", value: "90 days" },
      { label: "Universal Access keys", value: "5" },
      { label: "Access QR / mo", value: "100" },
      { label: "Guest call minutes / mo", value: fmt(1000) },
      { label: "API calls / mo", value: "1M" },
      { label: "Location updates / mo", value: "500K" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-2",
    name: "Organization 2",
    blurb: "Higher member, hub, and messaging capacity for growing teams.",
    usersLabel: "Up to 50 users",
    monthlyPrice: 119,
    annualTotal: 1190,
    features: [
      "Everything in Organization 1",
      "Higher member capacity",
      "More smart-home hubs",
      "Expanded Universal Access keys",
      "Higher guest-call minutes",
      "Higher API call limits",
    ],
    quotas: [
      { label: "Members", value: "50" },
      { label: "Smart-home hubs", value: "50" },
      { label: "Messages / mo", value: fmt(50000) },
      { label: "History retention", value: "180 days" },
      { label: "Universal Access keys", value: "10" },
      { label: "Access QR / mo", value: "200" },
      { label: "Guest call minutes / mo", value: fmt(2000) },
      { label: "API calls / mo", value: "3M" },
      { label: "Location updates / mo", value: "500K" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-3",
    name: "Organization 3",
    blurb: "More capacity for larger networks and longer history retention.",
    usersLabel: "Up to 100 users",
    monthlyPrice: 219,
    annualTotal: 2268,
    features: [
      "Everything in Organization 2",
      "Higher member capacity",
      "More smart-home hubs",
      "Longer history retention",
      "Expanded access QR limits",
      "Higher messaging limits",
    ],
    quotas: [
      { label: "Members", value: "100" },
      { label: "Smart-home hubs", value: "100" },
      { label: "Messages / mo", value: fmt(100000) },
      { label: "History retention", value: "180 days" },
      { label: "Universal Access keys", value: "25" },
      { label: "Access QR / mo", value: "500" },
      { label: "Guest call minutes / mo", value: fmt(5000) },
      { label: "API calls / mo", value: "3M" },
      { label: "Location updates / mo", value: "1.5M" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-4",
    name: "Organization 4",
    blurb: "Expanded limits for large facility and multi-site operations.",
    usersLabel: "Up to 500 users",
    monthlyPrice: 599,
    annualTotal: 5990,
    features: [
      "Everything in Organization 3",
      "Higher member capacity",
      "More smart-home hubs",
      "1-year history retention",
      "Expanded Universal Access keys",
      "Higher API and messaging limits",
    ],
    quotas: [
      { label: "Members", value: "500" },
      { label: "Smart-home hubs", value: "250" },
      { label: "Messages / mo", value: fmt(250000) },
      { label: "History retention", value: "365 days" },
      { label: "Universal Access keys", value: "50" },
      { label: "Access QR / mo", value: fmt(1000) },
      { label: "Guest call minutes / mo", value: fmt(10000) },
      { label: "API calls / mo", value: "7M" },
      { label: "Location updates / mo", value: "3.5M" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-5",
    name: "Organization 5",
    blurb: "Highest public Organization tier for large-scale networks.",
    usersLabel: "Up to 2,500 users",
    monthlyPrice: 899,
    annualTotal: 10788,
    features: [
      "Everything in Organization 4",
      "Highest member capacity",
      "Highest smart-home hub capacity",
      "1-year history retention",
      "Highest Universal Access key limits",
      "Highest API and messaging limits",
    ],
    quotas: [
      { label: "Members", value: "2,500" },
      { label: "Smart-home hubs", value: "500" },
      { label: "Messages / mo", value: "1M" },
      { label: "History retention", value: "365 days" },
      { label: "Universal Access keys", value: "100" },
      { label: "Access QR / mo", value: fmt(5000) },
      { label: "Guest call minutes / mo", value: fmt(30000) },
      { label: "API calls / mo", value: "75M" },
      { label: "Location updates / mo", value: "45M" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "custom",
    name: "Custom",
    blurb: "Tailored capacity and commercial terms for deployments beyond Organization 5.",
    usersLabel: "2,500+ users",
    monthlyPrice: null,
    annualTotal: null,
    features: [
      "All Organization 5 capabilities",
      "Custom member and hub limits",
      "Custom messaging and API limits",
      "Custom history retention",
      "Dedicated onboarding support",
      "Commercial terms by agreement",
    ],
    quotas: null,
    ctaLabel: "Contact Sales",
    ctaHref: "mailto:sales@hexzone.app?subject=Custom%20plan%20inquiry",
  },
];

export const HOME_PRICING_PLAN_IDS = [
  "individual-pro",
  "family",
  "org-1",
  "custom",
] as const;

export function formatMoney(amount: number): string {
  const fixed = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
  return `$${Number(fixed).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function planPriceCopy(plan: PricingPlan, interval: BillingInterval) {
  if (plan.monthlyPrice == null || plan.annualTotal == null) {
    return {
      primary: "Custom",
      secondary: "Contact us for capacity beyond Organization 5",
      period: null as string | null,
    };
  }
  if (interval === "monthly") {
    return {
      primary: formatMoney(plan.monthlyPrice),
      secondary: `${formatMoney(plan.annualTotal)} / year if billed annually`,
      period: "/ month",
    };
  }
  const effectiveMonthly = plan.annualTotal / 12;
  return {
    primary: formatMoney(effectiveMonthly),
    secondary: `${formatMoney(plan.annualTotal)} billed annually`,
    period: "/ month",
  };
}
