import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";
import { useAuth } from "../auth/useAuth";
import {
  PRICING_PLANS,
  planPriceCopy,
  type BillingInterval,
} from "../data/pricingPlans";
import {
  checkoutPlanKeyForPricingId,
  pricingCtaPathForPlan,
} from "../lib/planMapping";
import {
  confirmSubscriptionCheckout,
  createBillingPortalSession,
  createSubscriptionCheckout,
  getSubscriptionOverview,
  type SubscriptionOverview,
} from "../lib/api";

function pricingIdForPlanKey(planKey: string): string | null {
  switch (planKey) {
    case "enhanced":
      return "individual-pro";
    case "private_plus":
      return "family";
    case "enhanced_plus_1":
      return "org-1";
    case "enhanced_plus_2":
      return "org-2";
    case "enhanced_plus_3":
      return "org-3";
    case "enhanced_plus_4":
      return "org-4";
    case "enhanced_plus_5":
      return "org-5";
    case "exclusive":
      return null;
    default:
      return null;
  }
}

export function PricingPage() {
  const { token, user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [busyPlanKey, setBusyPlanKey] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [banner, setBanner] = useState<{
    tone: "ok" | "warn" | "error";
    text: string;
  } | null>(null);

  const signedIn = Boolean(token && user);
  const highlightedPlanId = searchParams.get("plan");

  const loadOverview = useCallback(async () => {
    if (!token) {
      setOverview(null);
      return;
    }
    setOverviewLoading(true);
    const result = await getSubscriptionOverview();
    if (result.error || !result.data) {
      setOverview(null);
      setBanner({
        tone: "error",
        text: result.error || "Could not load your current plan.",
      });
    } else {
      setOverview(result.data);
    }
    setOverviewLoading(false);
  }, [token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const checkout = (searchParams.get("checkout") || "").toLowerCase();
    const sessionId = searchParams.get("session_id") || "";
    if (!checkout) return;

    let cancelled = false;

    async function finishCheckout() {
      if (checkout === "cancel" || checkout === "cancelled") {
        if (!cancelled) {
          setBanner({
            tone: "warn",
            text: "Checkout cancelled. No charge was made.",
          });
        }
      } else if (checkout === "success") {
        if (!token) {
          if (!cancelled) {
            setBanner({
              tone: "warn",
              text: "Sign in again to finish activating your subscription.",
            });
          }
        } else if (!sessionId) {
          if (!cancelled) {
            setBanner({
              tone: "error",
              text: "Missing Checkout session. Try upgrading again.",
            });
          }
        } else {
          const result = await confirmSubscriptionCheckout(sessionId);
          if (cancelled) return;
          if (result.error || !result.data?.ok) {
            setBanner({
              tone: "error",
              text:
                result.error ||
                result.data?.message ||
                "Could not confirm payment.",
            });
          } else {
            setBanner({
              tone: "ok",
              text: `Subscription activated: ${result.data.plan.label}.`,
            });
            await refreshUser();
            await loadOverview();
          }
        }
      }

      if (!cancelled) {
        const next = new URLSearchParams(searchParams);
        next.delete("checkout");
        next.delete("session_id");
        setSearchParams(next, { replace: true });
      }
    }

    void finishCheckout();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, token, refreshUser, loadOverview]);

  const currentPlanKey = overview?.plan?.plan_key || "";
  const currentPricingId = useMemo(
    () => (currentPlanKey ? pricingIdForPlanKey(currentPlanKey) : null),
    [currentPlanKey],
  );

  async function startCheckout(planId: string) {
    const planKey = checkoutPlanKeyForPricingId(planId);
    if (!planKey) return;

    if (!signedIn) {
      navigate(
        `/login?next=${encodeURIComponent(pricingCtaPathForPlan(planId))}`,
      );
      return;
    }

    if (overview && !overview.can_manage_billing) {
      setBanner({
        tone: "warn",
        text: "Only the account holder can change the plan.",
      });
      return;
    }
    if (overview && !overview.stripe_configured) {
      setBanner({
        tone: "error",
        text: "Stripe is not configured on the server yet.",
      });
      return;
    }
    if (planKey === currentPlanKey) {
      setBanner({
        tone: "warn",
        text: "That is already your current plan.",
      });
      return;
    }

    setBusyPlanKey(planId);
    setBanner(null);
    const result = await createSubscriptionCheckout({
      plan_key: planKey,
      billing_interval: interval,
    });
    setBusyPlanKey(null);
    if (result.error || !result.data?.checkout_url) {
      setBanner({
        tone: "error",
        text: result.error || "Could not start Stripe Checkout.",
      });
      return;
    }
    window.location.assign(result.data.checkout_url);
  }

  async function openPortal() {
    if (!signedIn) {
      navigate("/login?next=/pricing");
      return;
    }
    setPortalBusy(true);
    const result = await createBillingPortalSession();
    setPortalBusy(false);
    if (result.error || !result.data?.portal_url) {
      setBanner({
        tone: "error",
        text: result.error || "Could not open billing portal.",
      });
      return;
    }
    window.location.assign(result.data.portal_url);
  }

  return (
    <main id="main">
      <PageHero
        eyebrow="Pricing"
        title="Plans for every scale"
        lead="Create a free Individual account first, then subscribe here after sign-in. Feature lists and limits match what the app actually ships."
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
              Choose monthly or annual billing. Annual saves roughly 16–17% across
              paid plans.
            </p>
          </div>

          {signedIn ? (
            <div className="pricing-current" aria-live="polite">
              {overviewLoading || authLoading ? (
                <p className="pricing-current__text">Loading your plan…</p>
              ) : overview ? (
                <>
                  <div className="pricing-current__copy">
                    <p className="pricing-current__label">Your current plan</p>
                    <p className="pricing-current__name">{overview.plan.label}</p>
                    <p className="pricing-current__meta">
                      Status: {overview.subscription.status}
                      {overview.subscription.billing_interval
                        ? ` · ${overview.subscription.billing_interval}`
                        : ""}
                      {!overview.can_manage_billing
                        ? " · managed by account holder"
                        : ""}
                    </p>
                  </div>
                  {overview.can_manage_billing ? (
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={portalBusy}
                      onClick={() => void openPortal()}
                    >
                      {portalBusy ? "Opening…" : "Manage billing"}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="pricing-current__text">
                  Signed in as {user?.email || "your account"}. Upgrade any paid
                  plan below.
                </p>
              )}
            </div>
          ) : (
            <div className="pricing-current pricing-current--guest">
              <p className="pricing-current__text">
                Sign in to subscribe and see your current plan. New accounts start
                as free Individual.
              </p>
              <div className="pricing-current__actions">
                <Link className="btn btn--primary" to="/login?next=/pricing">
                  Sign in
                </Link>
                <Link className="btn btn--outline" to="/register">
                  Create free account
                </Link>
              </div>
            </div>
          )}

          {banner ? (
            <p
              className={`pricing-banner pricing-banner--${banner.tone}`}
              role="status"
            >
              {banner.text}
            </p>
          ) : null}

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
              const isCustom = plan.monthlyPrice == null;
              const planKey = checkoutPlanKeyForPricingId(plan.id);
              const isCurrent =
                Boolean(planKey) && planKey === currentPlanKey
                  ? true
                  : plan.id === currentPricingId;
              const isHighlighted = highlightedPlanId === plan.id;
              const busy = busyPlanKey === plan.id;

              return (
                <li className="pricing__item" key={plan.id}>
                  <article
                    className={`plan plan--catalog${plan.popular ? " plan--featured" : ""}${isCurrent ? " plan--current" : ""}${isHighlighted ? " plan--highlight" : ""}`}
                    aria-labelledby={`catalog-${plan.id}`}
                  >
                    <div className="plan__body">
                      <h3 className="plan__name" id={`catalog-${plan.id}`}>
                        {plan.name}
                      </h3>
                      {isCurrent ? (
                        <p className="plan__badge plan__badge--current">
                          Current plan
                        </p>
                      ) : plan.popular ? (
                        <p className="plan__badge">Most Popular</p>
                      ) : null}
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
                            <Icon
                              id="i-check-circle"
                              className="icon plan__feature-icon"
                            />
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
                                <span className="plan__quota-name">
                                  {quota.label}
                                </span>
                                <span className="plan__quota-value">
                                  {quota.value}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="plan__quota-note">
                            Limits and commercial terms are scoped with sales for
                            your deployment.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="plan__footer">
                      {isCustom && plan.ctaHref ? (
                        <a
                          className="btn btn--primary plan__btn plan__btn--fill"
                          href={plan.ctaHref}
                        >
                          {plan.ctaLabel}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary plan__btn plan__btn--fill"
                          disabled={busy || isCurrent}
                          onClick={() => void startCheckout(plan.id)}
                        >
                          {busy
                            ? "Redirecting…"
                            : isCurrent
                              ? "Current plan"
                              : signedIn
                                ? "Subscribe"
                                : "Sign in to subscribe"}
                          {!busy && !isCurrent ? (
                            <Icon id="i-arrow-right" />
                          ) : null}
                        </button>
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
            <h2 className="page-cta__title">Need a Custom plan?</h2>
            <p className="page-cta__text">
              Review how zones and hubs work, or contact sales for capacity beyond
              Organization 5.
            </p>
          </div>
          <div className="page-cta__actions">
            <Link className="btn btn--primary" to="/contact">
              Contact sales
              <Icon id="i-arrow-right" />
            </Link>
            <Link className="btn btn--outline" to="/how-it-works">
              How it works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
