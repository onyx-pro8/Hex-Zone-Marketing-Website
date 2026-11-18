import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function accountTypeLabel(type?: string | null): string {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized === "EXCLUSIVE") return "Individual";
  if (normalized === "ENHANCED") return "Individual Pro";
  if (normalized === "PRIVATE_PLUS") return "Family";
  if (normalized === "ENHANCED_PLUS") return "Organization";
  if (normalized === "PRIVATE") return "Private / System";
  return type || "—";
}

function isSystemPrivate(type?: string | null): boolean {
  return String(type ?? "").toUpperCase() === "PRIVATE";
}

export function AccountPage() {
  const { user, token, loading, logout } = useAuth();
  const systemAccount = isSystemPrivate(user?.accountType ?? user?.account_type);

  if (!loading && !token) {
    return <Navigate to="/login?next=/account" replace />;
  }

  return (
    <main className="auth-page" id="main">
      <div className="container auth-page__inner">
        <section className="auth-card" aria-labelledby="account-title">
          <p className="eyebrow">Your account</p>
          <h1 className="auth-card__title" id="account-title">
            {loading ? "Loading…" : "User settings"}
          </h1>
          <p className="auth-card__lead">
            {user?.name ? `${user.name} · ` : ""}
            Manage your Safe Zone Patrol profile used by the marketing site and
            mobile app.
          </p>

          {user ? (
            <dl className="account-meta">
              <div>
                <dt>Email</dt>
                <dd>{user.email || "—"}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{accountTypeLabel(user.accountType ?? user.account_type)}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user.role || user.registrationType || "—"}</dd>
              </div>
              <div>
                <dt>Network ID</dt>
                <dd>{user.zoneId || user.zone_id || "—"}</dd>
              </div>
              {(user.communalId || user.communal_id) && (
                <div>
                  <dt>Communal ID</dt>
                  <dd>{user.communalId || user.communal_id}</dd>
                </div>
              )}
              {(user.tierLevel ?? user.tier_level) != null && (
                <div>
                  <dt>Organization level</dt>
                  <dd>{user.tierLevel ?? user.tier_level}</dd>
                </div>
              )}
            </dl>
          ) : null}

          <div className="auth-actions">
            <Link className="btn btn--outline" to="/pricing">
              {systemAccount ? "View pricing" : "Manage subscription"}
            </Link>
            <button className="btn btn--primary" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
