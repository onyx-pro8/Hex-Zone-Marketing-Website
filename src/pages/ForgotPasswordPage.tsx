import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthSplit } from "../components/AuthSplit";
import {
  confirmPasswordReset,
  requestPasswordReset,
  resendPasswordReset,
  resetPassword,
} from "../lib/api";

const CODE_LENGTH = 4;

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type Step = "email" | "code" | "password";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== "code") return;
    const timer = window.setInterval(() => {
      setResendIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "code") digitRefs.current[0]?.focus();
  }, [step]);

  function deliveryNotice(delivery: string, sent: boolean, address: string): void {
    if (delivery === "logged") {
      setNotice("Email delivery is not configured. The code was written to the server log.");
      setError("");
      return;
    }
    if (!sent && delivery !== "cooldown") {
      setError("Could not send the reset email. Use resend to try again.");
      setNotice("");
      return;
    }
    if (delivery === "cooldown") {
      setNotice(`A code was already sent to ${address}.`);
    } else {
      setNotice(`We sent a 4-digit code to ${address}.`);
    }
    setError("");
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const address = email.trim();
    if (!address) {
      setError("Enter the email on your account.");
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(address);
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error || "Could not send a reset code.");
      return;
    }
    setDigits(Array(CODE_LENGTH).fill(""));
    setResendIn(result.data.resend_after_seconds);
    deliveryNotice(result.data.delivery, result.data.sent, address);
    setStep("code");
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

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter the 4-digit code from your email.");
      return;
    }
    setLoading(true);
    const result = await confirmPasswordReset(email.trim(), code);
    setLoading(false);
    if (result.error || !result.data?.reset_token) {
      setError(result.error || "That code could not be verified.");
      return;
    }
    setResetToken(result.data.reset_token);
    setNotice("");
    setStep("password");
  }

  async function resendCode() {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    const result = await resendPasswordReset(email.trim());
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error || "Could not resend the code.");
      return;
    }
    setResendIn(result.data.resend_after_seconds);
    deliveryNotice(result.data.delivery, result.data.sent, email.trim());
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await resetPassword(email.trim(), resetToken, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate("/login", { replace: true });
  }

  const title =
    step === "email" ? "Reset password" : step === "code" ? "Enter your code" : "Choose a new password";
  const lead =
    step === "email"
      ? "Enter the email on your account. We'll send a 4-digit code."
      : step === "code"
        ? `Type the 4-digit code sent to ${email.trim()}.`
        : "This replaces the password on your account. You can sign in with it next.";

  return (
    <AuthSplit
      visualTitle="Back into your account."
      visualLead="We'll email a code, then you choose a new password."
    >
      <p className="eyebrow">Account recovery</p>
      <h1 className="auth-split__title">{title}</h1>
      <p className="auth-split__lead">{lead}</p>

      {step === "email" ? (
        <form className="auth-form" onSubmit={(event) => void sendCode(event)} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reset-email">
              Email
            </label>
            <input
              id="reset-email"
              className="auth-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn--primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending code…" : "Send verification code"}
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form className="auth-form" onSubmit={(event) => void verifyCode(event)} noValidate>
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
            {loading ? "Checking code…" : "Verify email"}
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
              setStep("email");
              setError("");
              setNotice("");
            }}
          >
            Use a different email
          </button>
        </form>
      ) : null}

      {step === "password" ? (
        <form className="auth-form" onSubmit={(event) => void savePassword(event)} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reset-password">
              New password
            </label>
            <div className="auth-input-row">
              <input
                id="reset-password"
                className="auth-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="auth-reveal"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reset-confirm">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn--primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Updating password…" : "Update password"}
          </button>
        </form>
      ) : null}

      <p className="auth-split__footer">
        Remembered it?{" "}
        <Link className="auth-link" to="/login">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
