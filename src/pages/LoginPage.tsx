import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthSplit } from "../components/AuthSplit";
import { useAuth } from "../auth/useAuth";
import { getLastEmail, persistLastEmail } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => getLastEmail());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next")?.startsWith("/")
    ? searchParams.get("next")!
    : "/account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password, { rememberMe });
      persistLastEmail(email);
      navigate(nextPath, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Check your credentials and try again.";
      setError(
        /inactive|expired|403/i.test(message)
          ? "Account is inactive or expired"
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplit
      visualTitle="One account across every surface"
      visualLead="Sign in with the same credentials used in the mobile app and operations console."
    >
      <p className="eyebrow">Welcome back</p>
      <h1 className="auth-split__title" id="login-title">
        Sign in
      </h1>
      <p className="auth-split__lead">
        Access your zones, billing, and account settings.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <div className="auth-input-row">
            <input
              id="login-password"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <label className="auth-check">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>Remember me on this device</span>
        </label>

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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-split__footer">
        New here?{" "}
        <Link className="auth-link" to="/register">
          Create an account
        </Link>
      </p>
    </AuthSplit>
  );
}
