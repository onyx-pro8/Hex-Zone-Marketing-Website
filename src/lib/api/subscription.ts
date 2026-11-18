import { request, type ApiResult } from "./client";

export type SubscriptionFeatureMeter = {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percent_used: number;
  unlimited: boolean;
  unit: string;
};

export type SubscriptionPlan = {
  plan_key: string;
  account_type: string;
  tier_level: number | null;
  label: string;
  price_monthly: number | null;
  price_annual: number | null;
  members: number | null;
  smart_home_hubs: number | null;
  messages_per_month: number | null;
  history_retention_days: number | null;
  ua_keys: number | null;
  ua_uses_per_key_per_month: number | null;
  access_qr_per_month: number | null;
  guest_call_minutes_per_month: number | null;
  api_calls_per_month: number | null;
  location_updates_per_month: number | null;
  allowed_message_types: string[];
};

export type SubscriptionOverview = {
  network_owner_id: number;
  viewer_owner_id: number;
  viewer_is_network_admin: boolean;
  viewer_is_member: boolean;
  plan: SubscriptionPlan;
  subscription: {
    plan_key: string;
    status: string;
    billing_interval: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  stripe_configured: boolean;
  year_month: string;
  features: SubscriptionFeatureMeter[];
  can_manage_billing: boolean;
  upgrade_plans: SubscriptionPlan[];
  scope_note: string;
};

export type ConfirmCheckoutResult = {
  ok: boolean;
  status: string;
  payment_status?: string;
  message: string;
  plan: SubscriptionPlan;
  account_type: string;
  role: string;
  tier_level: number | null;
};

function marketingReturnUrls() {
  const origin = window.location.origin;
  return {
    success_url: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    return_url: `${origin}/pricing`,
  };
}

export async function getSubscriptionOverview(): Promise<
  ApiResult<SubscriptionOverview>
> {
  return request<SubscriptionOverview>({
    method: "GET",
    path: "/subscription/me",
  });
}

export async function createSubscriptionCheckout(payload: {
  plan_key: string;
  billing_interval?: "monthly" | "annual";
}): Promise<
  ApiResult<{
    checkout_url: string;
    session_id: string;
    plan_key: string;
    billing_interval: string;
  }>
> {
  const urls = marketingReturnUrls();
  return request({
    method: "POST",
    path: "/subscription/checkout",
    body: {
      plan_key: payload.plan_key,
      billing_interval: payload.billing_interval ?? "monthly",
      success_url: urls.success_url,
      cancel_url: urls.cancel_url,
    },
  });
}

export async function createBillingPortalSession(): Promise<
  ApiResult<{ portal_url: string }>
> {
  const { return_url } = marketingReturnUrls();
  return request({
    method: "POST",
    path: "/subscription/portal",
    body: { return_url },
  });
}

export async function confirmSubscriptionCheckout(
  sessionId: string,
): Promise<ApiResult<ConfirmCheckoutResult>> {
  return request({
    method: "POST",
    path: "/subscription/confirm",
    body: { session_id: sessionId },
  });
}
