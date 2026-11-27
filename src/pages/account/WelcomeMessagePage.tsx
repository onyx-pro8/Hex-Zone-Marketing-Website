import { useEffect, useState, type FormEvent } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { useAuth } from "../../auth/useAuth";
import {
  getRemoteAppSettings,
  mergeRemoteAppSettings,
  updateRemoteAppSettings,
  type RemoteAppSettings,
} from "../../lib/api/profile";
import { isAccountAdministrator } from "../../lib/privateAccount";

const DEFAULT_WELCOME = "Welcome! {member_name} has joined the {network_name}.";

export function WelcomeMessagePage() {
  const { user } = useAuth();
  const isAdmin = isAccountAdministrator(user);
  const [remote, setRemote] = useState<RemoteAppSettings>(mergeRemoteAppSettings(null));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getRemoteAppSettings().then((result) => {
      if (cancelled) return;
      const merged = mergeRemoteAppSettings(result.data);
      setRemote(merged);
      setMessage(merged.memberJoinWelcome ?? "");
      if (result.error) setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const payload = mergeRemoteAppSettings({
      ...remote,
      memberJoinWelcome: message.trim(),
    });
    const result = await updateRemoteAppSettings(payload);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const merged = mergeRemoteAppSettings(result.data ?? payload);
    setRemote(merged);
    setMessage(merged.memberJoinWelcome ?? "");
    setSaved(true);
  }

  return (
    <AccountSettingsFrame
      title="Member welcome message"
      lead="Greeting when an invited member joins"
      backTo="/account-settings/message-templates"
    >
      {isAdmin ? (
        <form className="settings-card" onSubmit={(event) => void onSave(event)}>
          <p className="auth-hint">
            Shown when an invited member joins your network. Leave blank to use
            the default.
          </p>
          <div className="auth-field">
            <label className="auth-label" htmlFor="welcome-message">
              Welcome message
            </label>
            <textarea
              id="welcome-message"
              className="auth-input settings-textarea"
              value={message}
              placeholder={DEFAULT_WELCOME}
              onChange={(event) => {
                setMessage(event.target.value);
                setSaved(false);
              }}
            />
            <p className="auth-hint">
              Placeholders: {"{member_name}"}, {"{network_name}"}, {"{first_name}"}, {"{last_name}"}.
            </p>
          </div>
          {loading ? <p className="settings-status">Loading message…</p> : null}
          <button className="btn btn--primary" type="submit" disabled={loading || saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save welcome message"}
          </button>
        </form>
      ) : (
        <p className="settings-status">Only an administrator can edit the welcome message.</p>
      )}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </AccountSettingsFrame>
  );
}
