import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  fetchRegistrationCode,
  generateNetworkId,
  listCommunalIdsPublic,
  listJoinableNetworks,
  validateCommunalIdPublic,
  type AccountType,
  type CommunalIdRow,
  type JoinableNetwork,
  type RegistrationType,
} from "../lib/api";
import { planFromQuery } from "../lib/planMapping";

const accountOptions: {
  value: AccountType;
  title: string;
  lines: [string, string];
}[] = [
  {
    value: "EXCLUSIVE",
    title: "Individual",
    lines: ["Communal ID primary", "Up to 2 secondary zones"],
  },
  {
    value: "ENHANCED",
    title: "Individual Pro",
    lines: ["Solo administrator", "Zones, guests, API"],
  },
  {
    value: "PRIVATE_PLUS",
    title: "Family",
    lines: ["Up to 10 members", "Shared household network"],
  },
  {
    value: "ENHANCED_PLUS",
    title: "Organization",
    lines: ["Team capacity by level", "Admin dashboard"],
  },
];

export function CreateAccountPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPlan = useMemo(
    () => planFromQuery(searchParams.get("plan"), searchParams.get("tier")),
    [searchParams],
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(
    initialPlan.accountType,
  );
  const [registrationType, setRegistrationType] =
    useState<RegistrationType>("ADMINISTRATOR");
  const [administratorEmail, setAdministratorEmail] = useState("");
  const [needsAdministratorEmail, setNeedsAdministratorEmail] = useState(false);
  const [joinableNetworks, setJoinableNetworks] = useState<JoinableNetwork[]>(
    [],
  );
  const [address, setAddress] = useState("");
  const [zoneId, setZoneId] = useState(() => generateNetworkId());
  const [existingZoneId, setExistingZoneId] = useState("");
  const [communalId, setCommunalId] = useState("");
  const [communalValidated, setCommunalValidated] = useState(false);
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [communalStatus, setCommunalStatus] = useState("");
  const [communalBusy, setCommunalBusy] = useState(false);
  const [organizationLevel, setOrganizationLevel] = useState(
    initialPlan.tierLevel ?? 1,
  );
  const [registrationCode, setRegistrationCode] = useState("");
  const [regCodeLoading, setRegCodeLoading] = useState(true);
  const [regCodeError, setRegCodeError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isIndividual = accountType === "EXCLUSIVE";
  const isIndividualPro = accountType === "ENHANCED";
  const isOrganizationAdmin =
    accountType === "ENHANCED_PLUS" && registrationType === "ADMINISTRATOR";
  const joiningNetwork =
    !isIndividual && !isIndividualPro && registrationType === "USER";

  const loadRegistrationCode = useCallback(async () => {
    if (isIndividual) {
      setRegistrationCode("FREE");
      setRegCodeLoading(false);
      setRegCodeError(null);
      return;
    }
    if (joiningNetwork) {
      setRegistrationCode("");
      setRegCodeLoading(false);
      setRegCodeError(null);
      return;
    }
    setRegCodeLoading(true);
    setRegCodeError(null);
    const result = await fetchRegistrationCode();
    if (result.error || !result.data) {
      setRegistrationCode("");
      setRegCodeError(result.error ?? "Could not load registration code.");
    } else {
      setRegistrationCode(result.data);
    }
    setRegCodeLoading(false);
  }, [isIndividual, joiningNetwork]);

  useEffect(() => {
    void loadRegistrationCode();
  }, [loadRegistrationCode]);

  useEffect(() => {
    if (!isIndividual) return;
    let cancelled = false;
    void listCommunalIdsPublic().then((result) => {
      if (cancelled) return;
      setCommunalRows(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [isIndividual]);

  useEffect(() => {
    if (!joiningNetwork) return;
    let cancelled = false;
    void listJoinableNetworks(accountType).then((result) => {
      if (cancelled) return;
      setJoinableNetworks(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [joiningNetwork, accountType]);

  useEffect(() => {
    setAccountType(initialPlan.accountType);
    if (initialPlan.tierLevel) setOrganizationLevel(initialPlan.tierLevel);
  }, [initialPlan]);

  const selectedZoneId = joiningNetwork
    ? existingZoneId.trim()
    : zoneId.trim();

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
    const code = isIndividual ? "FREE" : registrationCode.trim();

    if (!isIndividual && !joiningNetwork && !code) {
      setError(
        "Registration code is missing. Wait for the server to issue one, or retry.",
      );
      return;
    }
    if (joiningNetwork && !selectedZoneId) {
      setError("Enter the Network ID of the account you are joining.");
      return;
    }
    if (joiningNetwork && needsAdministratorEmail && !administratorEmail.trim()) {
      setError(
        "Several administrators share this Network ID. Enter the administrator email.",
      );
      return;
    }
    if (isIndividual && (!communalId.trim() || !communalValidated)) {
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
        accountType,
        registrationType: isIndividual
          ? "USER"
          : isIndividualPro
            ? "ADMINISTRATOR"
            : registrationType,
        ...(joiningNetwork &&
        needsAdministratorEmail &&
        administratorEmail.trim()
          ? { administratorEmail: administratorEmail.trim() }
          : {}),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        zoneId: selectedZoneId || undefined,
        ...(isIndividual
          ? { communalId: communalId.trim().toUpperCase() }
          : {}),
        ...(joiningNetwork ? {} : { registrationCode: code }),
        ...(isOrganizationAdmin ? { tierLevel: organizationLevel } : {}),
      });
      navigate("/login?next=/account");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message ||
          "Could not create account. Please review your details and try again.",
      );
      if (/administrator email/i.test(message)) {
        setNeedsAdministratorEmail(true);
      }
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
            Registers into the same owners database as the Safe Zone Patrol
            mobile app.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="auth-fieldset">
              <legend className="auth-label">Plan</legend>
              <div className="auth-plan-grid" role="radiogroup" aria-label="Account plan">
                {accountOptions.map((option) => {
                  const active = accountType === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`auth-plan${active ? " is-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value={option.value}
                        checked={active}
                        onChange={() => {
                          setAccountType(option.value);
                          setCommunalValidated(false);
                          setCommunalStatus("");
                          if (option.value === "EXCLUSIVE") {
                            setRegistrationType("USER");
                          } else if (option.value === "ENHANCED") {
                            setRegistrationType("ADMINISTRATOR");
                          }
                        }}
                      />
                      <span className="auth-plan__title">{option.title}</span>
                      <span className="auth-plan__line">{option.lines[0]}</span>
                      <span className="auth-plan__line">{option.lines[1]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {!isIndividual && !isIndividualPro ? (
              <fieldset className="auth-fieldset">
                <legend className="auth-label">Registration type</legend>
                <div className="auth-segment">
                  <label className={registrationType === "ADMINISTRATOR" ? "is-active" : ""}>
                    <input
                      type="radio"
                      name="registrationType"
                      checked={registrationType === "ADMINISTRATOR"}
                      onChange={() => setRegistrationType("ADMINISTRATOR")}
                    />
                    Create network (admin)
                  </label>
                  <label className={registrationType === "USER" ? "is-active" : ""}>
                    <input
                      type="radio"
                      name="registrationType"
                      checked={registrationType === "USER"}
                      onChange={() => setRegistrationType("USER")}
                    />
                    Join existing network
                  </label>
                </div>
              </fieldset>
            ) : null}

            {isOrganizationAdmin ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="org-level">
                  Organization level
                </label>
                <select
                  id="org-level"
                  className="auth-input"
                  value={organizationLevel}
                  onChange={(e) => setOrganizationLevel(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

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

            {isIndividual ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-communal">
                  Communal ID
                </label>
                <p className="auth-hint">
                  Required for Individual accounts. Pick a public Communal ID
                  that already has zones.
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
            ) : null}

            {joiningNetwork ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-join-network">
                  Network ID to join
                </label>
                <input
                  id="reg-join-network"
                  className="auth-input"
                  list="joinable-networks"
                  value={existingZoneId}
                  onChange={(e) => setExistingZoneId(e.target.value)}
                  placeholder="Enter Network ID"
                  required
                />
                <datalist id="joinable-networks">
                  {joinableNetworks.map((row) => (
                    <option
                      key={row.network_id}
                      value={row.network_id}
                      label={row.label || row.network_id}
                    />
                  ))}
                </datalist>
                {needsAdministratorEmail ? (
                  <div className="auth-field auth-field--nested">
                    <label className="auth-label" htmlFor="reg-admin-email">
                      Administrator email
                    </label>
                    <input
                      id="reg-admin-email"
                      className="auth-input"
                      type="email"
                      value={administratorEmail}
                      onChange={(e) => setAdministratorEmail(e.target.value)}
                      required
                    />
                  </div>
                ) : null}
              </div>
            ) : !isIndividual ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-network">
                  Network ID
                </label>
                <div className="auth-input-row">
                  <input
                    id="reg-network"
                    className="auth-input"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value.toUpperCase())}
                    required
                  />
                  <button
                    className="btn btn--outline auth-inline-btn"
                    type="button"
                    onClick={() => setZoneId(generateNetworkId())}
                  >
                    New
                  </button>
                </div>
              </div>
            ) : null}

            {!isIndividual && !joiningNetwork ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-code">
                  Registration code
                </label>
                <div className="auth-input-row">
                  <input
                    id="reg-code"
                    className="auth-input"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    readOnly={regCodeLoading}
                    required
                  />
                  <button
                    className="btn btn--outline auth-inline-btn"
                    type="button"
                    onClick={() => void loadRegistrationCode()}
                    disabled={regCodeLoading}
                  >
                    Retry
                  </button>
                </div>
                {regCodeLoading ? (
                  <p className="auth-hint">Loading code from server…</p>
                ) : null}
                {regCodeError ? (
                  <p className="auth-error" role="alert">
                    {regCodeError}
                  </p>
                ) : null}
              </div>
            ) : null}

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
              {loading ? "Creating account…" : "Create account"}
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
