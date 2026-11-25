import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthSplit } from "../components/AuthSplit";
import { useAuth } from "../auth/useAuth";
import { clearLastEmail, getLastEmail, getRememberMe, persistLastEmail } from "../lib/api";

type PasswordCredentialCtor = new (form: HTMLFormElement) => Credential;

function rememberBrowserLogin(form: HTMLFormElement): void {
  const PasswordCredential = (
    window as Window & { PasswordCredential?: PasswordCredentialCtor }
  ).PasswordCredential;
  if (!PasswordCredential || !navigator.credentials?.store) return;
  try {
    const credential = new PasswordCredential(form);
    void navigator.credentials.store(credential);
  } catch {
    /* The browser declined to store this login. */
  }
}

export function LoginPage() {
  const { login, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMe());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next")?.startsWith("/")
    ? searchParams.get("next")!
    : "/account";
  const sessionReady = Boolean(token && user);

  useEffect(() => {
    if (authLoading || !sessionReady) return;
    navigate(nextPath, { replace: true });
  }, [authLoading, sessionReady, navigate, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = (emailRef.current?.value ?? "").trim();
    const password = passwordRef.current?.value ?? "";
    setError("");
    setLoading(true);
    if (rememberMe) rememberBrowserLogin(form);
    try {
      await login(email, password, { rememberMe });
      if (rememberMe) persistLastEmail(email);
      else clearLastEmail();
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

  if (token && (authLoading || sessionReady)) {
    return (
      <AuthSplit
        visualTitle="One account across every surface"
        visualLead="Sign in with the same credentials used in the mobile app and operations console."
      >
        <p className="eyebrow">Welcome back</p>
        <h1 className="auth-split__title">Signing you back in</h1>
        <p className="auth-split__lead">This browser already has your saved sign-in.</p>
      </AuthSplit>
    );
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

      <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="auth-input"
            name="username"
            type="email"
            autoComplete="username"
            defaultValue={getLastEmail()}
            ref={emailRef}
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
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              ref={passwordRef}
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

        <div className="auth-login-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me on this device</span>
          </label>
          <Link className="auth-link" to="/forgot-password">
            Forgot password?
          </Link>
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
