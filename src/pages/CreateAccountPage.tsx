import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";

function generateZoneId(): string {
  return `Network-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
import { Link, useNavigate } from "react-router-dom";
import { AddressAutocompleteInput } from "../components/AddressAutocompleteInput";
import { AuthSplit } from "../components/AuthSplit";
import {
  confirmSignupVerification,
  listCommunalIdsPublic,
  resendSignupVerification,
  startSignupVerification,
  validateCommunalIdPublic,
  type CommunalIdRow,
} from "../lib/api";

const CODE_LENGTH = 4;

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function CreateAccountPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [zoneId, setZoneId] = useState(() => generateZoneId());
  const [communalId, setCommunalId] = useState("");
  const [communalValidated, setCommunalValidated] = useState(false);
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [communalStatus, setCommunalStatus] = useState("");
  const [communalBusy, setCommunalBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "verify">("details");
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [resendIn, setResendIn] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== "verify") return;
    const timer = window.setInterval(() => {
      setResendIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "verify") digitRefs.current[0]?.focus();
  }, [step]);

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

    const networkId = zoneId.trim();
    if (!networkId) {
      setError("Enter or generate a network ID.");
      return;
    }
    const communal = communalId.trim().toUpperCase();
    if (communal && !communalValidated) {
      setError(
        "Validate your Communal ID, or clear it to continue without a primary zone.",
      );
      return;
    }

    setLoading(true);
    setNotice("");
    const result = await startSignupVerification({
      name: `${firstName} ${lastName}`.trim(),
      email: email.trim(),
      password,
      accountType: "EXCLUSIVE",
      registrationType: "USER",
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      zoneId: networkId,
      ...(communal ? { communalId: communal } : {}),
    });
    setLoading(false);
    if (result.error || !result.data) {
      setError(
        result.error ||
          "Could not create account. Please review your details and try again.",
      );
      return;
    }
    setDigits(Array(CODE_LENGTH).fill(""));
    setResendIn(result.data.resend_after_seconds);
    if (result.data.delivery === "logged") {
      setNotice(
        "Email delivery is not configured on the server. The code was written to the server log.",
      );
    } else if (!result.data.sent && result.data.delivery !== "cooldown") {
      setError("Could not send the verification email. Use resend to try again.");
    } else if (result.data.delivery === "cooldown") {
      setNotice(`A code was already sent to ${email.trim()}.`);
    } else {
      setNotice(`We sent a 4-digit code to ${email.trim()}.`);
    }
    setStep("verify");
  }

  function applyDigits(raw: string, startIndex: number) {
    const chars = raw.replace(/\D/g, "").slice(0, CODE_LENGTH - startIndex).split("");
    if (chars.length === 0) {
      setDigits((current) => {
        const next = [...current];
        next[startIndex] = "";
        return next;
      });
      return;
    }
    setDigits((current) => {
      const next = [...current];
      chars.forEach((char, offset) => {
        next[startIndex + offset] = char;
      });
      return next;
    });
    const focusAt = Math.min(startIndex + chars.length, CODE_LENGTH - 1);
    digitRefs.current[focusAt]?.focus();
  }

  function onDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function onDigitPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/\d/.test(text)) return;
    event.preventDefault();
    applyDigits(text, 0);
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter the 4-digit code from your email.");
      return;
    }
    setLoading(true);
    const result = await confirmSignupVerification(email.trim(), code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate("/login?next=/pricing");
  }

  async function resendCode() {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    const result = await resendSignupVerification(email.trim());
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error || "Could not resend the code.");
      return;
    }
    setResendIn(result.data.resend_after_seconds);
    if (result.data.delivery === "logged") {
      setNotice("Email delivery is not configured. The new code was written to the server log.");
    } else if (!result.data.sent && result.data.delivery !== "cooldown") {
      setError("Could not send the verification email. Try again in a moment.");
    } else if (result.data.sent) {
      setNotice(`We sent a new code to ${email.trim()}.`);
    }
  }

  if (step === "verify") {
    return (
      <AuthSplit
        visualTitle="Check your inbox."
        visualLead="We email a 4-digit code so only you can finish creating this account."
      >
        <p className="eyebrow">Verify email</p>
        <h1 className="auth-split__title">Enter your code</h1>
        <p className="auth-split__lead">
          Type the 4-digit code sent to <strong>{email.trim()}</strong>. The
          account is created after the code matches.
        </p>
        <form className="auth-form" onSubmit={confirmCode} noValidate>
          <div className="auth-code" role="group" aria-label="4-digit verification code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  digitRefs.current[index] = node;
                }}
                className="auth-code__digit"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                value={digit}
                onChange={(event) => applyDigits(event.target.value, index)}
                onKeyDown={(event) => onDigitKeyDown(index, event)}
                onPaste={onDigitPaste}
              />
            ))}
          </div>
          {notice ? <p className="auth-status is-ok">{notice}</p> : null}
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn--primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Checking code…" : "Verify and create account"}
          </button>
          <button
            className="auth-reveal auth-code__resend"
            type="button"
            disabled={loading || resendIn > 0}
            onClick={() => void resendCode()}
          >
            {resendIn > 0 ? `Resend code in ${formatCountdown(resendIn)}` : "Resend code"}
          </button>
          <button
            className="auth-link auth-code__back"
            type="button"
            onClick={() => {
              setStep("details");
              setError("");
              setNotice("");
            }}
          >
            Edit account details
          </button>
        </form>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      visualTitle="Start free. Scale when ready."
      visualLead="Create an Individual account now, then subscribe to Pro, Family, or Organization from Pricing after sign-in."
    >
      <p className="eyebrow">Get started</p>
      <h1 className="auth-split__title" id="register-title">
        Create account
      </h1>
      <p className="auth-split__lead">
        Free Individual signup. Upgrade anytime after you sign in.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-plan-line" aria-label="Account plan">
          <div className="auth-plan-line__top">
            <span className="auth-label">Plan</span>
            <span className="auth-plan-line__tag">Included</span>
          </div>
          <div className="auth-plan-line__row">
            <span className="auth-plan-line__name">Individual</span>
            <span className="auth-plan-line__price">Free</span>
          </div>
          <p className="auth-plan-line__note">
            Individual Pro, Family, and Organization are available on{" "}
            <Link className="auth-link" to="/pricing">
              Pricing
            </Link>{" "}
            after sign-in.
          </p>
        </div>

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

            <AddressAutocompleteInput
              id="reg-address"
              label="Address"
              value={address}
              onChange={(next) => setAddress(next)}
              hint="Start typing and pick a suggestion."
            />

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-network">
            Network ID
          </label>
          <p className="auth-hint">
            Saved on your account and shown on the members list. This is not
            your email.
          </p>
          <div className="auth-input-row">
            <input
              id="reg-network"
              className="auth-input"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value.toUpperCase())}
              placeholder="Network-ABC123"
              autoCapitalize="characters"
              required
            />
            <button
              className="auth-reveal"
              type="button"
              onClick={() => setZoneId(generateZoneId())}
            >
              New
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-communal">
            Communal ID{" "}
            <span className="auth-optional">(optional)</span>
          </label>
          <p className="auth-hint">
            Optional. If you choose one with zones, those become your primary.
            Skip it to create with no primary — secondary zones only.
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
              placeholder="COMM-… or leave blank"
            />
            <button
              className="auth-reveal"
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
          {loading ? "Sending code…" : "Create free account"}
        </button>
      </form>

      <p className="auth-split__footer">
        Already have an account?{" "}
        <Link className="auth-link" to="/login">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
