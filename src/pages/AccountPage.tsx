import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { AddressAutocompleteInput } from "../components/AddressAutocompleteInput";
import { PermissionWorkspace } from "../components/dashboard/PermissionWorkspace";
import { useAuth } from "../auth/useAuth";
import {
  checkUsernameAvailable,
  getRemoteAppSettings,
  getSubscriptionOverview,
  mergeRemoteAppSettings,
  updateOwnerProfile,
  updateRemoteAppSettings,
  uploadProfileAvatar,
  type RemoteAppSettings,
  type SubscriptionOverview,
} from "../lib/api";
import {
  absolutizeAvatarUrl,
  clearBlackAvatarBackground,
  initialsFor,
  readFileAsDataUrl,
  useAuthenticatedAvatarSrc,
} from "../lib/avatar";
import { normalizeUsername, validateUsernameFormat } from "../lib/username";

function accountTypeLabel(type?: string | null): string {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized === "EXCLUSIVE") return "Individual";
  if (normalized === "ENHANCED") return "Individual Pro";
  if (normalized === "PRIVATE_PLUS") return "Family";
  if (normalized === "ENHANCED_PLUS") return "Organization";
  if (normalized === "PRIVATE") return "Private / System";
  return type || "—";
}

function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Member", last_name: "User" };
  if (parts.length === 1) return { first_name: parts[0]!, last_name: "User" };
  return {
    first_name: parts[0]!,
    last_name: parts.slice(1).join(" "),
  };
}

/** Seed/legacy rows sometimes stored a role title in `address`. Treat as empty. */
function sanitizeAddressValue(value?: string | null): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (
    normalized === "system administrator" ||
    normalized === "system admin" ||
    normalized === "administrator" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "null"
  ) {
    return "";
  }
  return trimmed;
}

export function AccountPage() {
  const { user, token, loading, logout, refreshUser, setUserAvatar } =
    useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keepLocalAvatarPreview = useRef(false);
  const usernameCheckSeq = useRef(0);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hostedAvatarLabel, setHostedAvatarLabel] = useState<string | null>(
    null,
  );
  const [broadcastName, setBroadcastName] = useState("");
  const [address, setAddress] = useState("");
  const [remoteSettings, setRemoteSettings] = useState<RemoteAppSettings>(
    mergeRemoteAppSettings(null),
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);

  const previewSrc = useAuthenticatedAvatarSrc(avatarUrl);
  const accountType = user?.accountType ?? user?.account_type;
  const systemAccount = String(accountType ?? "").toUpperCase() === "PRIVATE";
  const canGrantPermission =
    systemAccount &&
    String(user?.role ?? "").toLowerCase() === "administrator" &&
    String(user?.platform_staff_role ?? user?.platformStaffRole ?? "none")
      .toLowerCase()
      .replace(/[\s-]+/g, "_") !== "technical_support";
  const roleLabel =
    String(user?.role ?? "").toLowerCase() === "administrator"
      ? "Administrator"
      : "User";

  useEffect(() => {
    if (!user) return;
    setName((user.name ?? "").trim());
    setEmail((user.email ?? "").trim());
    setUsername((user.username ?? "").trim());
    if (!keepLocalAvatarPreview.current) {
      setAvatarUrl(user.avatar_url ?? user.avatarUrl ?? null);
      setHostedAvatarLabel(
        user.avatar_url && !String(user.avatar_url).startsWith("data:")
          ? String(user.avatar_url)
          : null,
      );
    }
  }, [
    user?.id,
    user?.name,
    user?.email,
    user?.username,
    user?.avatar_url,
    user?.avatarUrl,
  ]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      const [settingsResult, subscriptionResult] = await Promise.all([
        getRemoteAppSettings(),
        getSubscriptionOverview(),
      ]);
      if (cancelled) return;
      if (settingsResult.data) {
        const merged = mergeRemoteAppSettings(settingsResult.data);
        const cleanedAddress = sanitizeAddressValue(
          merged.address || user?.address || "",
        );
        setRemoteSettings({ ...merged, address: cleanedAddress });
        setBroadcastName((merged.broadcastName ?? "").trim());
        setAddress(cleanedAddress);
      } else {
        setAddress(sanitizeAddressValue(user?.address));
      }
      if (subscriptionResult.data) setOverview(subscriptionResult.data);
      setSettingsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.address]);

  useEffect(() => {
    if (!user?.id) return;
    if ((user.username ?? "").trim()) return;
    void refreshUser();
  }, [user?.id, user?.username, refreshUser]);

  const accountTypeHint = useMemo(() => {
    const planName = accountTypeLabel(accountType);
    if (String(accountType ?? "").toUpperCase() === "EXCLUSIVE") {
      return `${planName} (free, user role). Upgrade on Pricing — account type changes automatically after payment.`;
    }
    if (systemAccount) {
      return `${planName} · ${roleLabel}. System administrator accounts have full access and no subscription billing.`;
    }
    return `${planName} · ${roleLabel}. Account type is set by your subscription; it is not edited here.`;
  }, [accountType, roleLabel, systemAccount]);

  if (!loading && !token) {
    return <Navigate to="/login?next=/account" replace />;
  }

  async function validateUsernameOnFinish(
    raw: string,
  ): Promise<{ ok: boolean; message: string | null }> {
    const trimmed = normalizeUsername(raw);
    const seq = ++usernameCheckSeq.current;
    if (!trimmed) {
      setUsernameHint(null);
      setCheckingUsername(false);
      return { ok: false, message: "Username is required." };
    }
    const formatError = validateUsernameFormat(trimmed);
    if (formatError) {
      setUsernameHint(formatError);
      setCheckingUsername(false);
      return { ok: false, message: formatError };
    }
    const current = normalizeUsername(user?.username ?? "");
    if (trimmed === current) {
      setUsernameHint(null);
      setCheckingUsername(false);
      return { ok: true, message: null };
    }
    setCheckingUsername(true);
    const res = await checkUsernameAvailable(trimmed);
    if (seq !== usernameCheckSeq.current) {
      return { ok: false, message: "Username check was interrupted." };
    }
    setCheckingUsername(false);
    if (res.error) {
      setUsernameHint(res.error);
      return { ok: false, message: res.error };
    }
    setUsernameHint(null);
    return { ok: true, message: null };
  }

  async function clearAvatar() {
    if (!user?.id) {
      setError("Not signed in.");
      return;
    }
    setError("");
    setStatus("");
    keepLocalAvatarPreview.current = true;
    setAvatarUrl(null);
    setHostedAvatarLabel(null);
    setUserAvatar(null);
    setProfileSaved(false);
    setUploadingAvatar(true);
    const res = await updateOwnerProfile(user.id, { avatar_url: "" });
    setUploadingAvatar(false);
    if (res.error) {
      setError(res.error);
      setStatus("Could not remove avatar. Try again.");
      return;
    }
    keepLocalAvatarPreview.current = false;
    await refreshUser();
    setUserAvatar(null);
    setAvatarUrl(null);
    setHostedAvatarLabel(null);
    setStatus("Avatar removed.");
  }

  async function onImageSelected(file: File) {
    setError("");
    setStatus("");
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2_500_000) {
      setError("Image is too large (max about 2.5 MB).");
      return;
    }

    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const dataUrl = await clearBlackAvatarBackground(rawDataUrl);
      keepLocalAvatarPreview.current = true;
      setAvatarUrl(dataUrl);
      setHostedAvatarLabel(null);
      setUserAvatar(dataUrl);
      setProfileSaved(false);
      setUploadingAvatar(true);

      const res = await uploadProfileAvatar(dataUrl);
      setUploadingAvatar(false);
      if (res.error || !res.data?.avatar_url) {
        setError(res.error ?? "Could not upload avatar.");
        return;
      }

      const remote = String(res.data.avatar_url).trim();
      const thinPath =
        user?.id != null
          ? absolutizeAvatarUrl(`/owners/${user.id}/avatar`)
          : remote;
      setHostedAvatarLabel(remote);
      keepLocalAvatarPreview.current = false;
      setAvatarUrl(
        `${thinPath}${thinPath.includes("?") ? "&" : "?"}v=${Date.now()}`,
      );
      setUserAvatar(thinPath);
      await refreshUser();
      setStatus("Avatar uploaded.");
    } catch (err) {
      setUploadingAvatar(false);
      setError(err instanceof Error ? err.message : "Could not upload avatar.");
    }
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user?.id) {
      setError("Not signed in.");
      return;
    }
    setError("");
    setStatus("");
    const trimmedUsername = normalizeUsername(username);
    const check = await validateUsernameOnFinish(trimmedUsername);
    if (!check.ok) {
      setError(check.message || "Invalid username.");
      return;
    }

    const { first_name, last_name } = splitName(name);
    setSavingProfile(true);
    setProfileSaved(false);

    const payload: Parameters<typeof updateOwnerProfile>[1] = {
      first_name,
      last_name,
      username: trimmedUsername,
    };
    if (!avatarUrl && !hostedAvatarLabel) {
      payload.avatar_url = "";
    } else if (hostedAvatarLabel) {
      payload.avatar_url = hostedAvatarLabel;
    } else if (avatarUrl && !avatarUrl.startsWith("data:")) {
      payload.avatar_url = avatarUrl;
    }

    const res = await updateOwnerProfile(user.id, payload);
    setSavingProfile(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await refreshUser();
    keepLocalAvatarPreview.current = false;
    setProfileSaved(true);
    setStatus("Profile saved.");
  }

  async function onSaveIdentity(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    setSavingIdentity(true);
    setIdentitySaved(false);
    const payload = mergeRemoteAppSettings({
      ...remoteSettings,
      broadcastName: broadcastName.trim(),
      address: address.trim(),
    });
    const res = await updateRemoteAppSettings(payload);
    setSavingIdentity(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const merged = mergeRemoteAppSettings(res.data ?? payload);
    setRemoteSettings(merged);
    setBroadcastName(merged.broadcastName ?? "");
    setAddress(merged.address ?? "");
    await refreshUser();
    setIdentitySaved(true);
    setStatus("Address and broadcast name updated.");
  }

  const initials = initialsFor(name || user?.name, email || user?.email);
  const thinAvatarPath =
    user?.id != null ? absolutizeAvatarUrl(`/owners/${user.id}/avatar`) : null;

  return (
    <main className="auth-page settings-page" id="main">
      <div className="container settings-page__inner">
        <header className="settings-page__header">
          <p className="eyebrow">Your account</p>
          <h1 className="settings-page__title">User settings</h1>
          <p className="settings-page__lead">
            Profile, avatar, address, and subscription — same account as the
            mobile app.
          </p>
        </header>

        {loading ? (
          <p className="settings-status">Loading your settings…</p>
        ) : null}

        <section className="settings-section" aria-labelledby="profile-title">
          <h2 className="settings-section__title" id="profile-title">
            Profile
          </h2>

          <form
            className="settings-form"
            onSubmit={(e) => void onSaveProfile(e)}
          >
            <div className="settings-avatar">
              <button
                type="button"
                className={`settings-avatar__button${previewSrc ? " has-photo" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Upload profile photo"
              >
                {previewSrc ? (
                  <img src={previewSrc} alt="" width={96} height={96} />
                ) : (
                  <span className="settings-avatar__fallback">{initials}</span>
                )}
              </button>
              <div className="settings-avatar__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? "Uploading…" : "Upload photo"}
                </button>
                {avatarUrl ? (
                  <button
                    type="button"
                    className="btn btn--ghost-light"
                    disabled={uploadingAvatar}
                    onClick={() => void clearAvatar()}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="auth-hint">
                {hostedAvatarLabel
                  ? `Hosted at: ${thinAvatarPath || hostedAvatarLabel}`
                  : uploadingAvatar
                    ? "Uploading photo…"
                    : avatarUrl
                      ? "Photo ready"
                      : "JPEG, PNG, WebP, or GIF up to about 2.5 MB."}
              </p>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void onImageSelected(file);
                }}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="settings-name">
                Name
              </label>
              <input
                id="settings-name"
                className="auth-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setProfileSaved(false);
                }}
                autoComplete="name"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="settings-username">
                Username
              </label>
              <input
                id="settings-username"
                className="auth-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s+/g, "").toLowerCase());
                  setUsernameHint(null);
                  setProfileSaved(false);
                }}
                onBlur={() => void validateUsernameOnFinish(username)}
                autoComplete="username"
                required
              />
              <p className="auth-hint">
                {checkingUsername
                  ? "Checking username…"
                  : usernameHint ||
                    "Lowercase letters, numbers, and underscores only."}
              </p>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="settings-email">
                Email
              </label>
              <input
                id="settings-email"
                className="auth-input"
                value={email}
                readOnly
                disabled
              />
              <p className="auth-hint">
                Private login email — not shown publicly.
              </p>
            </div>

            <div className="auth-field">
              <span className="auth-label">Account type</span>
              <p className="settings-readonly">
                {accountTypeLabel(accountType)}
              </p>
              <p className="auth-hint">{accountTypeHint}</p>
            </div>

            <div className="auth-field">
              <span className="auth-label">Network ID</span>
              <p className="settings-readonly">
                {user?.zoneId || user?.zone_id || "—"}
              </p>
            </div>

            <button
              className="btn btn--primary auth-submit"
              type="submit"
              disabled={savingProfile || uploadingAvatar}
            >
              {savingProfile
                ? "Saving…"
                : profileSaved
                  ? "Profile saved"
                  : "Save profile"}
            </button>
          </form>
        </section>

        <section className="settings-section" aria-labelledby="identity-title">
          <h2 className="settings-section__title" id="identity-title">
            Address & broadcast
          </h2>
          <p className="settings-section__lead">
            Neighbours only see your broadcast name. Leave it blank to use your
            account name
            {name.trim() ? ` (${name.trim()})` : ""} in messages.
          </p>

          <form
            className="settings-form"
            onSubmit={(e) => void onSaveIdentity(e)}
          >
            <div className="auth-field">
              <label className="auth-label" htmlFor="settings-broadcast">
                Broadcast name
              </label>
              <input
                id="settings-broadcast"
                className="auth-input"
                value={broadcastName}
                onChange={(e) => {
                  setBroadcastName(e.target.value);
                  setIdentitySaved(false);
                }}
                placeholder={name.trim() || "e.g. Neighbour alias"}
              />
            </div>

            <AddressAutocompleteInput
              id="settings-address"
              label="Address"
              value={address}
              onChange={(next) => {
                setAddress(next);
                setIdentitySaved(false);
              }}
              hint="Start typing and pick a suggestion to set your home address."
            />

            <button
              className="btn btn--primary auth-submit"
              type="submit"
              disabled={!settingsLoaded || savingIdentity}
            >
              {savingIdentity
                ? "Saving…"
                : identitySaved
                  ? "Saved"
                  : "Update address & broadcast name"}
            </button>
          </form>
        </section>

        {canGrantPermission ? (
          <section className="settings-section" aria-labelledby="permission-title">
            <h2 className="settings-section__title" id="permission-title">
              Permission
            </h2>
            <PermissionWorkspace />
          </section>
        ) : null}

        <section
          className="settings-section"
          aria-labelledby="subscription-title"
        >
          <h2 className="settings-section__title" id="subscription-title">
            Subscription
          </h2>
          <div className="settings-subscription">
            <p className="settings-readonly">
              {overview?.plan?.label || accountTypeLabel(accountType)}
            </p>
            <p className="auth-hint">
              {systemAccount
                ? "System administrator — full access, no Stripe billing."
                : overview?.scope_note ||
                  "Manage billing and upgrades on the pricing page."}
            </p>
            <div className="auth-actions">
              <Link className="btn btn--outline" to="/pricing">
                {systemAccount ? "View pricing" : "Manage subscription"}
              </Link>
              <button
                className="btn btn--primary"
                type="button"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="settings-status is-ok" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </main>
  );
}
