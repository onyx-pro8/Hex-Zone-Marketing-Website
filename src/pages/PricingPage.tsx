import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";
import {
  PRICING_PLANS,
  planPriceCopy,
  type BillingInterval,
} from "../data/pricingPlans";

export function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <main id="main">
      <PageHero
        eyebrow="Pricing"
        title="Plans for every scale"
        lead="Compare every Safe Zone Patrol subscription in detail — from Individual Pro to Enterprise — with features, limits, and monthly or annual billing."
      />

      <section
        className="pricing pricing--page page-section page-section--tint"
        aria-labelledby="pricing-catalog-title"
      >
        <div className="container">
          <div className="section-head pricing__head">
            <p className="eyebrow">All subscriptions</p>
            <h2 className="section-title" id="pricing-catalog-title">
              Find the right plan for your needs
            </h2>
            <p className="section-sub">
              Choose monthly or annual billing. Annual saves roughly 16–17% across paid plans.
            </p>
          </div>

          <div className="billing-toggle" role="group" aria-label="Billing interval">
            <button
              type="button"
              className={`billing-toggle__btn${interval === "monthly" ? " is-active" : ""}`}
              aria-pressed={interval === "monthly"}
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`billing-toggle__btn${interval === "annual" ? " is-active" : ""}`}
              aria-pressed={interval === "annual"}
              onClick={() => setInterval("annual")}
            >
              Annual
              <span className="billing-toggle__save">Save ~17%</span>
            </button>
          </div>

          <ul className="pricing-catalog list-reset" role="list">
            {PRICING_PLANS.map((plan) => {
              const price = planPriceCopy(plan, interval);
              const isEnterprise = plan.monthlyPrice == null;

              return (
                <li className="pricing__item" key={plan.id}>
                  <article
                    className={`plan plan--catalog${plan.popular ? " plan--featured" : ""}`}
                    aria-labelledby={`catalog-${plan.id}`}
                  >
                    <div className="plan__body">
                      <h3 className="plan__name" id={`catalog-${plan.id}`}>
                        {plan.name}
                      </h3>
                      {plan.popular ? <p className="plan__badge">Most Popular</p> : null}
                      <p className="plan__desc">{plan.blurb}</p>

                      <p className="plan__price">
                        <span className="plan__amount">{price.primary}</span>
                        {price.period ? (
                          <span className="plan__period">
                            <span aria-hidden="true">{price.period}</span>
                            <span className="visually-hidden">per month</span>
                          </span>
                        ) : null}
                      </p>
                      <p className="plan__price-note">{price.secondary}</p>
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
                      {isEnterprise && plan.ctaHref ? (
                        <a className="btn btn--primary plan__btn plan__btn--fill" href={plan.ctaHref}>
                          {plan.ctaLabel}
                        </a>
                      ) : (
                        <a className="btn btn--primary plan__btn plan__btn--fill" href="#">
                          {plan.ctaLabel}
                          <Icon id="i-arrow-right" />
                        </a>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="page-section page-section--cta" aria-label="Next steps">
        <div className="container page-cta">
          <div className="page-cta__copy">
            <h2 className="page-cta__title">Not sure which plan fits?</h2>
            <p className="page-cta__text">
              Review how zones and hubs work, or explore smart-home limits before you choose.
            </p>
          </div>
          <div className="page-cta__actions">
            <Link className="btn btn--primary" to="/how-it-works">
              How it works
              <Icon id="i-arrow-right" />
            </Link>
            <Link className="btn btn--outline" to="/smart-home">
              Smart home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
