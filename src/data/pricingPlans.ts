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

/** Full catalog aligned with Hex-Zone-Client PricingPlans / mobile subscription. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "individual-pro",
    name: "Individual Pro",
    blurb: "Solo administrator with GPS, geofencing, and API access.",
    usersLabel: "1 active user",
    monthlyPrice: 4.99,
    annualTotal: 29.88,
    features: [
      "GPS tracking",
      "Geofencing",
      "Emergency alerts",
      "Maps",
      "Mobile app",
      "REST API & mobile SDK",
    ],
    quotas: [
      { label: "Members", value: "1" },
      { label: "Smart-home hubs", value: "1" },
      { label: "API calls / mo", value: "25,000" },
      { label: "Location updates / mo", value: "10,000" },
      { label: "Alerts / mo", value: "100" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "family",
    name: "Family",
    blurb: "Share location and alerts across your household.",
    usersLabel: "Up to 10 users",
    monthlyPrice: 9.99,
    annualTotal: 95.88,
    features: [
      "Family location sharing",
      "GPS tracking",
      "Geofencing",
      "Emergency alerts",
      "Location history",
      "Mobile SDK & REST API",
    ],
    quotas: [
      { label: "Members", value: "10" },
      { label: "Smart-home hubs", value: "Included" },
      { label: "API calls / mo", value: "100,000" },
      { label: "Location updates / mo", value: "50,000" },
      { label: "Alerts / mo", value: "500" },
    ],
    popular: true,
    ctaLabel: "Get Started",
  },
  {
    id: "org-1",
    name: "Organization 1",
    blurb: "Admin dashboard and core ops tooling for growing teams.",
    usersLabel: "Up to 200 users",
    monthlyPrice: 59.9,
    annualTotal: 598.8,
    features: [
      "Admin dashboard",
      "GPS tracking",
      "Geofencing",
      "Emergency alerts",
      "Location history",
      "Basic analytics",
      "REST API & mobile SDK",
    ],
    quotas: [
      { label: "Members", value: "200" },
      { label: "Smart-home hubs", value: "Unlimited" },
      { label: "API calls / mo", value: "1M" },
      { label: "Location updates / mo", value: "500K" },
      { label: "Alerts / mo", value: "2,500" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-2",
    name: "Organization 2",
    blurb: "Higher API limits, reporting, and extra credentials.",
    usersLabel: "Up to 200 users",
    monthlyPrice: 119,
    annualTotal: 1190,
    features: [
      "Everything in Org 1",
      "Enhanced reporting",
      "Additional API credentials/keys",
      "Location rate limits",
      "Basic analytics",
      "REST API & mobile SDK",
    ],
    quotas: [
      { label: "Members", value: "200" },
      { label: "Smart-home hubs", value: "Unlimited" },
      { label: "API calls / mo", value: "3M" },
      { label: "Location updates / mo", value: "500K" },
      { label: "Alerts / mo", value: "2,500" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-3",
    name: "Organization 3",
    blurb: "Advanced geofencing, audit logs, and priority support.",
    usersLabel: "Up to 1,000 users",
    monthlyPrice: 219,
    annualTotal: 2268,
    features: [
      "Everything in Org 2",
      "Advanced geofencing",
      "Advanced reporting",
      "Audit logs",
      "Higher API rate limits",
      "Priority support",
    ],
    quotas: [
      { label: "Members", value: "1,000" },
      { label: "Smart-home hubs", value: "Unlimited" },
      { label: "API calls / mo", value: "3M" },
      { label: "Location updates / mo", value: "1.5M" },
      { label: "Alerts / mo", value: "7,500" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-4",
    name: "Organization 4",
    blurb: "Enterprise administration with expanded limits and SLA option.",
    usersLabel: "Up to 1,000 users",
    monthlyPrice: 599,
    annualTotal: 5990,
    features: [
      "Everything in Org 3",
      "Advanced analytics",
      "Enterprise administration",
      "Expanded API limits",
      "SDK support",
      "Priority support",
      "SLA option",
    ],
    quotas: [
      { label: "Members", value: "1,000" },
      { label: "Smart-home hubs", value: "Unlimited" },
      { label: "API calls / mo", value: "7M" },
      { label: "Location updates / mo", value: "3.5M" },
      { label: "Alerts / mo", value: "15,000" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "org-5",
    name: "Organization 5",
    blurb: "Large-scale networks with dedicated support and SLA.",
    usersLabel: "Up to 10,000 users",
    monthlyPrice: 899,
    annualTotal: 10788,
    features: [
      "Everything in Org 4",
      "Enterprise dashboard",
      "Audit logs",
      "High API limits",
      "Dedicated support",
      "SLA",
      "Enterprise integration",
    ],
    quotas: [
      { label: "Members", value: "10,000" },
      { label: "Smart-home hubs", value: "Unlimited" },
      { label: "API calls / mo", value: "75M" },
      { label: "Location updates / mo", value: "45M" },
      { label: "Alerts / mo", value: "150,000" },
    ],
    ctaLabel: "Get Started",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Custom limits, infrastructure, and integrations for 10,000+ users.",
    usersLabel: "10,000+ users",
    monthlyPrice: null,
    annualTotal: null,
    features: [
      "All features",
      "Custom usage limits",
      "Dedicated infrastructure",
      "SLA & support",
      "Account manager",
      "Custom integrations",
    ],
    quotas: null,
    ctaLabel: "Contact Sales",
    ctaHref: "mailto:sales@hexzone.app?subject=Enterprise%20plan%20inquiry",
  },
];

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
      secondary: "Tailored for your organization",
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
