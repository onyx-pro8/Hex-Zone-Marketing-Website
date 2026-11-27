import { useEffect, useState, type FormEvent } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { useAuth } from "../../auth/useAuth";
import {
  GUEST_ARRIVAL_MESSAGE_MAX_LEN,
  getGuestArrivalMessages,
  normalizeGuestArrivalMessageField,
  updateGuestArrivalMessages,
} from "../../lib/api/guestArrival";
import { getZones, type SavedZone } from "../../lib/api/zones";
import { isAccountAdministrator } from "../../lib/privateAccount";

function zoneKey(zone: SavedZone): string {
  return String(zone.zone_id ?? zone.id ?? "").trim();
}

export function ArrivalMessagesPage() {
  const { user } = useAuth();
  const isAdmin = isAccountAdministrator(user);
  const [zones, setZones] = useState<SavedZone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [expected, setExpected] = useState("");
  const [unexpected, setUnexpected] = useState("");
  const [expectedDefault, setExpectedDefault] = useState("");
  const [unexpectedDefault, setUnexpectedDefault] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getZones().then((result) => {
      if (cancelled) return;
      const rows = (result.data ?? []).filter((zone) => zoneKey(zone));
      setZones(rows);
      setZoneId((current) => current || (rows[0] ? zoneKey(rows[0]) : ""));
      if (result.error) setError(result.error);
      if (!rows.length) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!zoneId || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getGuestArrivalMessages(zoneId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not load arrival messages.");
        return;
      }
      setExpected(result.data.expected_arrival_message ?? "");
      setUnexpected(result.data.unexpected_arrival_message ?? "");
      setExpectedDefault(result.data.defaults.expected_arrival_message);
      setUnexpectedDefault(result.data.defaults.unexpected_arrival_message);
    });
    return () => {
      cancelled = true;
    };
  }, [zoneId, isAdmin]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!zoneId) return;
    setError("");
    setStatus("");
    let expectedValue: string | null;
    let unexpectedValue: string | null;
    try {
      expectedValue = normalizeGuestArrivalMessageField(expected);
      unexpectedValue = normalizeGuestArrivalMessageField(unexpected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message is too long.");
      return;
    }
    setSaving(true);
    const result = await updateGuestArrivalMessages(zoneId, {
      expected_arrival_message: expectedValue,
      unexpected_arrival_message: unexpectedValue,
    });
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error ?? "Could not save arrival messages.");
      return;
    }
    setExpected(result.data.expected_arrival_message ?? "");
    setUnexpected(result.data.unexpected_arrival_message ?? "");
    setStatus("Arrival messages saved.");
  }

  return (
    <AccountSettingsFrame
      title="Arrival messages"
      lead="Copy guests see when they arrive"
      backTo="/account-settings/message-templates"
    >
      {isAdmin ? null : (
        <p className="settings-status">Only an administrator can edit arrival messages.</p>
      )}
      {isAdmin ? (
        <form className="settings-card" onSubmit={(event) => void onSave(event)}>
          <p className="auth-hint">
            Leave a field blank to use the default for new arrivals. Existing
            visits keep the copy they already received.
          </p>
          {zones.length > 1 ? (
            <div className="auth-field">
              <label className="auth-label" htmlFor="arrival-zone">
                Zone
              </label>
              <select
                id="arrival-zone"
                className="auth-input"
                value={zoneId}
                onChange={(event) => {
                  setZoneId(event.target.value);
                  setStatus("");
                }}
              >
                {zones.map((zone) => {
                  const key = zoneKey(zone);
                  return (
                    <option key={key} value={key}>
                      {zone.name?.trim() || key}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}
          <div className="auth-field">
            <label className="auth-label" htmlFor="arrival-expected">
              Expected (on schedule)
            </label>
            <textarea
              id="arrival-expected"
              className="auth-input settings-textarea"
              maxLength={GUEST_ARRIVAL_MESSAGE_MAX_LEN}
              value={expected}
              placeholder={expectedDefault}
              onChange={(event) => {
                setExpected(event.target.value);
                setStatus("");
              }}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="arrival-unexpected">
              Unexpected (waiting copy)
            </label>
            <textarea
              id="arrival-unexpected"
              className="auth-input settings-textarea"
              maxLength={GUEST_ARRIVAL_MESSAGE_MAX_LEN}
              value={unexpected}
              placeholder={unexpectedDefault}
              onChange={(event) => {
                setUnexpected(event.target.value);
                setStatus("");
              }}
            />
          </div>
          {loading ? <p className="settings-status">Loading messages…</p> : null}
          <button className="btn btn--primary" type="submit" disabled={saving || !zoneId}>
            {saving ? "Saving…" : "Save arrival messages"}
          </button>
        </form>
      ) : null}
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
    </AccountSettingsFrame>
  );
}
