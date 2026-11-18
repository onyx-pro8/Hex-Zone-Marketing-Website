import { Link } from "react-router-dom";
import {
  HOME_PRICING_PLAN_IDS,
  PRICING_PLANS,
  formatMoney,
} from "../data/pricingPlans";
import { registerPathForPlan } from "../lib/planMapping";
import { Icon } from "./Icon";

const homePlans = HOME_PRICING_PLAN_IDS.map((id) => {
  const plan = PRICING_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Missing home pricing plan: ${id}`);
  return plan;
});

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
            Prices and limits match the live Safe Zone Patrol subscription catalog.
          </p>
        </div>

        <ul className="pricing__plans list-reset" role="list">
          {homePlans.map((plan) => {
            const featured = Boolean(plan.popular);
            const amount =
              plan.monthlyPrice == null ? null : formatMoney(plan.monthlyPrice);
            return (
              <li className="pricing__item" key={plan.id}>
                <article
                  className={`plan${featured ? " plan--featured" : ""}`}
                  aria-labelledby={`home-${plan.id}`}
                >
                  <div className="plan__body">
                    <h3 className="plan__name" id={`home-${plan.id}`}>
                      {plan.name}
                    </h3>
                    {featured ? <p className="plan__badge">Most Popular</p> : null}
                    <p className="plan__desc">{plan.blurb}</p>
                    {amount ? (
                      <p className="plan__price">
                        <span className="plan__amount">{amount}</span>
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
                          Limits and commercial terms are scoped with sales.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="plan__footer">
                    {plan.ctaHref ? (
                      <a
                        className="btn btn--outline plan__btn"
                        href={plan.ctaHref}
                      >
                        {plan.ctaLabel}
                        <span className="visually-hidden"> about {plan.name}</span>
                      </a>
                    ) : (
                      <Link
                        className={
                          featured ? "btn btn--outline plan__btn" : "link-arrow plan__cta"
                        }
                        to={registerPathForPlan(plan.id)}
                      >
                        {plan.ctaLabel}
                        <span className="visually-hidden"> with {plan.name}</span>
                        <Icon id="i-arrow-right" />
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
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
