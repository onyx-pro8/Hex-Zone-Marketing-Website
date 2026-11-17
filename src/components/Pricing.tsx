import { Link } from "react-router-dom";
import { Icon } from "./Icon";

type Plan = {
  id: string;
  name: string;
  desc: string;
  amount?: string;
  usersLabel: string;
  featured?: boolean;
  badge?: string;
  features: string[];
  quotas: { label: string; value: string }[] | null;
  ctaLabel: string;
  ctaClass: string;
};

/** Feature details aligned with Hex-Zone-Client PricingPlans + mobile subscription limits. */
const plans: Plan[] = [
  {
    id: "plan-individual",
    name: "Individual Pro",
    desc: "Perfect for personal use",
    amount: "$9.99",
    usersLabel: "1 active user",
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
    ctaClass: "link-arrow plan__cta",
  },
  {
    id: "plan-family",
    name: "Family",
    desc: "Share safety and stay connected",
    amount: "$19.99",
    usersLabel: "Up to 10 users",
    featured: true,
    badge: "Most Popular",
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
    ctaLabel: "Get Started",
    ctaClass: "btn btn--outline plan__btn",
  },
  {
    id: "plan-organization",
    name: "Organization",
    desc: "For teams and businesses",
    amount: "$49.99",
    usersLabel: "Up to 200 users",
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
    ctaClass: "link-arrow plan__cta",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    desc: "Custom solutions for large organizations",
    usersLabel: "10,000+ users",
    features: [
      "All features",
      "Custom usage limits",
      "Dedicated infrastructure",
      "SLA & support",
      "Account manager",
      "Custom integrations",
    ],
    quotas: null,
    ctaLabel: "Contact Us",
    ctaClass: "btn btn--outline plan__btn",
  },
];

export function Pricing() {
  return (
    <section className="pricing" id="pricing" aria-labelledby="pricing-title">
      <div className="container">
        <div className="section-head pricing__head">
          <p className="eyebrow">Flexible Plans</p>
          <h2 className="section-title" id="pricing-title">
            Find the Right Plan for Your Needs
          </h2>
          <p className="section-sub">
            From individual use to enterprise deployments, we have a plan for you.
          </p>
        </div>

        <ul className="pricing__plans list-reset" role="list">
          {plans.map((plan) => (
            <li className="pricing__item" key={plan.id}>
              <article
                className={`plan${plan.featured ? " plan--featured" : ""}`}
                aria-labelledby={plan.id}
              >
                <div className="plan__body">
                  <h3 className="plan__name" id={plan.id}>
                    {plan.name}
                  </h3>
                  {plan.badge ? <p className="plan__badge">{plan.badge}</p> : null}
                  <p className="plan__desc">{plan.desc}</p>
                  {plan.amount ? (
                    <p className="plan__price">
                      <span className="plan__amount">{plan.amount}</span>
                      <span className="plan__period">
                        <span aria-hidden="true">/ month</span>
                        <span className="visually-hidden">per month</span>
                      </span>
                    </p>
                  ) : (
                    <p className="plan__price plan__price--custom">
                      <span className="plan__amount">Custom</span>
                    </p>
                  )}
                  <p className="plan__users">{plan.usersLabel}</p>

                  <ul className="plan__features list-reset" role="list">
                    {plan.features.map((feature) => (
                      <li className="plan__feature" key={feature}>
                        <Icon id="i-check-circle" className="icon plan__feature-icon" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="plan__quotas">
                    <p className="plan__quotas-label">Plan limits</p>
                    {plan.quotas ? (
                      <ul className="plan__quota-list list-reset" role="list">
                        {plan.quotas.map((quota) => (
                          <li className="plan__quota" key={quota.label}>
                            <span className="plan__quota-name">{quota.label}</span>
                            <span className="plan__quota-value">{quota.value}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="plan__quota-note">
                        Contact us for a tailored solution with custom limits.
                      </p>
                    )}
                  </div>
                </div>
                <div className="plan__footer">
                  <a className={plan.ctaClass} href="#">
                    {plan.ctaLabel}
                    <span className="visually-hidden">
                      {plan.ctaLabel === "Contact Us" ? " about " : " with "}
                      {plan.name}
                    </span>
                    {plan.ctaLabel !== "Contact Us" ? <Icon id="i-arrow-right" /> : null}
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="pricing__more">
          <Link className="link-arrow" to="/pricing">
            See all subscription plans
            <Icon id="i-arrow-right" />
          </Link>
        </p>
      </div>
    </section>
  );
}
