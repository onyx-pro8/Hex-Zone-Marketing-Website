import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { getDevices, updateDevice, type DeviceRecord } from "../../lib/api/devices";
import { getOrCreateWebHid } from "../../lib/api/messages";
import { ensureWebSessionOnline } from "../../lib/sessionDevice";

function sameHid(device: DeviceRecord, hid: string): boolean {
  return String(device.hid ?? "").trim().toUpperCase() === hid.toUpperCase();
}

export function NotificationSettingsPage() {
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  async function load() {
    setLoading(true);
    setError("");
    const hid = getOrCreateWebHid();
    let listed = await getDevices();
    if (listed.error) setError(listed.error);
    let match = (listed.data ?? []).find((row) => sameHid(row, hid)) ?? null;
    if (!match) {
      await ensureWebSessionOnline();
      listed = await getDevices();
      match = (listed.data ?? []).find((row) => sameHid(row, hid)) ?? null;
    }
    setDevice(match);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleNotifications() {
    if (!device) return;
    setBusy(true);
    setError("");
    setStatus("");
    const next = device.enable_notification === false;
    const result = await updateDevice(device.id, { enable_notification: next });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error ?? "Could not update notifications.");
      return;
    }
    setDevice(result.data);
    setStatus(next ? "Notifications enabled for this browser." : "Notifications turned off for this browser.");
  }

  async function requestBrowserPermission() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    setStatus(
      permission === "granted"
        ? "This browser can show notifications."
        : "Browser notifications stay off until they are allowed.",
    );
  }

  const enabled = device?.enable_notification !== false;
  const permissionLabel =
    browserPermission === "unsupported"
      ? "This browser does not support notifications."
      : browserPermission === "granted"
        ? "Browser permission is on."
        : browserPermission === "denied"
          ? "Browser permission is blocked."
          : "Browser permission has not been requested.";

  return (
    <AccountSettingsFrame
      title="Notification"
      lead="Push alerts for this device"
      backTo="/account-settings"
    >
      {loading ? <p className="settings-status">Loading this browser…</p> : null}
      <article className="settings-card">
        <div className="settings-nav settings-nav--static">
          <span className="settings-nav__icon" aria-hidden="true">
            <Bell size={18} />
          </span>
          <span className="settings-nav__copy">
            <span className="settings-nav__title">Push notifications</span>
            <span className="settings-nav__subtitle">
              {device
                ? enabled
                  ? "Enabled — this browser is marked to receive alerts"
                  : "Off for this browser session"
                : "This browser is not registered yet"}
            </span>
          </span>
        </div>
        <p className="auth-hint">
          Phones register their own push token in the mobile app. This switch
          controls the browser you are using now.
        </p>
        <button
          className="btn btn--primary"
          type="button"
          disabled={!device || busy}
          onClick={() => void toggleNotifications()}
        >
          {busy ? "Saving…" : enabled ? "Turn off" : "Turn on"}
        </button>
      </article>
      <article className="settings-card">
        <div className="settings-nav settings-nav--static">
          <span className="settings-nav__icon" aria-hidden="true">
            <BellRing size={18} />
          </span>
          <span className="settings-nav__copy">
            <span className="settings-nav__title">Browser permission</span>
            <span className="settings-nav__subtitle">{permissionLabel}</span>
          </span>
        </div>
        {browserPermission === "default" ? (
          <button className="btn btn--outline" type="button" onClick={() => void requestBrowserPermission()}>
            Allow notifications
          </button>
        ) : null}
      </article>
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
