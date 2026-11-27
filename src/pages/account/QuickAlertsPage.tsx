import { useEffect, useState, type FormEvent } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import {
  getRemoteAppSettings,
  mergeRemoteAppSettings,
  updateRemoteAppSettings,
  type RemoteAppSettings,
} from "../../lib/api/profile";

const ALERTS: { key: string; label: string }[] = [
  { key: "PANIC", label: "Panic alert" },
  { key: "SENSOR", label: "Sensor alert" },
  { key: "NS_PANIC", label: "Non-specific (anti-retaliation) alert" },
  { key: "UNKNOWN", label: "Unknown alert" },
  { key: "WELLNESS_CHECK", label: "Wellness check" },
];

export function QuickAlertsPage() {
  const [remote, setRemote] = useState<RemoteAppSettings>(mergeRemoteAppSettings(null));
  const [draft, setDraft] = useState<Record<string, string>>(
    mergeRemoteAppSettings(null).quickMessages ?? {},
  );
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
      setDraft({ ...(merged.quickMessages ?? {}) });
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
    const payload = mergeRemoteAppSettings({ ...remote, quickMessages: draft });
    const result = await updateRemoteAppSettings(payload);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const merged = mergeRemoteAppSettings(result.data ?? payload);
    setRemote(merged);
    setDraft({ ...(merged.quickMessages ?? {}) });
    setSaved(true);
  }

  return (
    <AccountSettingsFrame
      title="Quick alert messages"
      lead="Preset text for the alert buttons"
      backTo="/account-settings/message-templates"
    >
      <form className="settings-card" onSubmit={(event) => void onSave(event)}>
        <p className="auth-hint">
          Pre-programmed text sent when a Quick Alert button is pressed. Leave
          blank to compose manually.
        </p>
        {ALERTS.map((alert) => (
          <div className="auth-field" key={alert.key}>
            <label className="auth-label" htmlFor={`alert-${alert.key}`}>
              {alert.label}
            </label>
            <textarea
              id={`alert-${alert.key}`}
              className="auth-input settings-textarea"
              value={draft[alert.key] ?? ""}
              onChange={(event) => {
                setSaved(false);
                setDraft((current) => ({ ...current, [alert.key]: event.target.value }));
              }}
            />
          </div>
        ))}
        {loading ? <p className="settings-status">Loading messages…</p> : null}
        <button className="btn btn--primary" type="submit" disabled={loading || saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save quick alert messages"}
        </button>
      </form>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </AccountSettingsFrame>
  );
}
