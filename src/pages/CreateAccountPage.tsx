import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  listCommunalIdsPublic,
  validateCommunalIdPublic,
  type CommunalIdRow,
} from "../lib/api";

export function CreateAccountPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [communalId, setCommunalId] = useState("");
  const [communalValidated, setCommunalValidated] = useState(false);
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [communalStatus, setCommunalStatus] = useState("");
  const [communalBusy, setCommunalBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listCommunalIdsPublic().then((result) => {
      if (cancelled) return;
      setCommunalRows(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function validateCommunal() {
    const code = communalId.trim().toUpperCase();
    if (code.length < 3) {
      setCommunalValidated(false);
      setCommunalStatus("Enter a Communal ID (at least 3 characters).");
      return;
    }
    setCommunalBusy(true);
    setCommunalStatus("Validating…");
    const result = await validateCommunalIdPublic(code);
    setCommunalBusy(false);
    if (result.error || !result.data?.valid) {
      setCommunalValidated(false);
      setCommunalStatus(
        result.error ||
          result.data?.message ||
          "Communal ID not found or has no zones yet.",
      );
      return;
    }
    setCommunalId(code);
    setCommunalValidated(true);
    const count = result.data.zones?.length ?? 0;
    setCommunalStatus(
      count > 0
        ? `Valid — ${count} zone(s) will become your primary.`
        : "Communal ID is valid.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!communalId.trim() || !communalValidated) {
      setError(
        "Select and validate a Communal ID. Its zones become your primary zone.",
      );
      return;
    }

    setLoading(true);
    try {
      await register({
        name: `${firstName} ${lastName}`.trim(),
        email: email.trim(),
        password,
        accountType: "EXCLUSIVE",
        registrationType: "USER",
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        communalId: communalId.trim().toUpperCase(),
      });
      navigate("/login?next=/pricing");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message ||
          "Could not create account. Please review your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" id="main">
      <div className="container auth-page__inner">
        <section className="auth-card auth-card--wide" aria-labelledby="register-title">
          <p className="eyebrow">Get started</p>
          <h1 className="auth-card__title" id="register-title">
            Create account
          </h1>
          <p className="auth-card__lead">
            Start with a free Individual account. After you sign in, upgrade from
            the pricing page when you are ready.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="auth-fieldset">
              <legend className="auth-label">Plan</legend>
              <div className="auth-plan-grid" role="radiogroup" aria-label="Account plan">
                <label className="auth-plan is-active">
                  <input
                    type="radio"
                    name="accountType"
                    value="EXCLUSIVE"
                    checked
                    readOnly
                  />
                  <span className="auth-plan__title">Individual</span>
                  <span className="auth-plan__line">Free to create</span>
                  <span className="auth-plan__line">Upgrade anytime after sign-in</span>
                </label>
              </div>
              <p className="auth-hint">
                Paid plans (Individual Pro, Family, Organization) are available
                after sign-in on the pricing page.
              </p>
            </fieldset>

            <div className="auth-grid">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-first">
                  First name
                </label>
                <input
                  id="reg-first"
                  className="auth-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-last">
                  Last name
                </label>
                <input
                  id="reg-last"
                  className="auth-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">
                Password
              </label>
              <div className="auth-input-row">
                <input
                  id="reg-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  className="auth-reveal"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="auth-grid">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-phone">
                  Phone <span className="auth-optional">(optional)</span>
                </label>
                <input
                  id="reg-phone"
                  className="auth-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-address">
                  Address <span className="auth-optional">(optional)</span>
                </label>
                <input
                  id="reg-address"
                  className="auth-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-communal">
                Communal ID
              </label>
              <p className="auth-hint">
                Required for Individual accounts. Pick a public Communal ID that
                already has zones.
              </p>
              <div className="auth-input-row">
                <input
                  id="reg-communal"
                  className="auth-input"
                  list="communal-id-options"
                  value={communalId}
                  onChange={(e) => {
                    setCommunalId(e.target.value.toUpperCase());
                    setCommunalValidated(false);
                    setCommunalStatus("");
                  }}
                  placeholder="COMM-…"
                  required
                />
                <button
                  className="btn btn--outline auth-inline-btn"
                  type="button"
                  disabled={communalBusy}
                  onClick={() => void validateCommunal()}
                >
                  {communalBusy ? "…" : "Validate"}
                </button>
              </div>
              <datalist id="communal-id-options">
                {communalRows.map((row) => (
                  <option
                    key={row.reference_id}
                    value={row.reference_id}
                    label={`${row.reference_id} · ${row.zone_count} zones`}
                  />
                ))}
              </datalist>
              {communalStatus ? (
                <p
                  className={
                    communalValidated ? "auth-status is-ok" : "auth-status"
                  }
                >
                  {communalStatus}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="btn btn--primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account?{" "}
            <Link className="auth-link" to="/login">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
