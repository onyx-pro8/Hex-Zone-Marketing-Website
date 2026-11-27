import { useEffect, useMemo, useState } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { deleteDevice, getDevices, updateDevice, type DeviceRecord } from "../../lib/api/devices";
import { getOrCreateWebHid } from "../../lib/api/messages";

const PRESENCE_MS = 30 * 60 * 1000;

function isSessionHid(hid?: string | null): boolean {
  const upper = String(hid ?? "").trim().toUpperCase();
  return upper.startsWith("MOB-") || upper.startsWith("WEB-");
}

function isOnline(device: DeviceRecord): boolean {
  if (device.is_online !== true) return false;
  const seen = device.last_seen ?? device.updated_at ?? device.created_at;
  if (!seen) return true;
  const time = new Date(seen).getTime();
  if (Number.isNaN(time)) return true;
  return Date.now() - time <= PRESENCE_MS;
}

function ownerLabel(device: DeviceRecord): string {
  const owner = device.owner;
  if (!owner) return "";
  const full = `${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim();
  return full || owner.username?.trim() || owner.email?.trim() || "";
}

function formatSeen(value?: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const webHid = useMemo(() => getOrCreateWebHid(), []);

  async function load() {
    setLoading(true);
    const result = await getDevices();
    setLoading(false);
    if (result.error) setError(result.error);
    setDevices(result.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function signOut(device: DeviceRecord) {
    setPendingId(String(device.id));
    setError("");
    setStatus("");
    const result = await updateDevice(device.id, { is_online: false });
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus(`${device.name || device.hid} signed out.`);
    await load();
  }

  async function remove(device: DeviceRecord) {
    const label = device.name || device.hid;
    if (!window.confirm(`Remove ${label}?`)) return;
    setPendingId(String(device.id));
    setError("");
    setStatus("");
    const result = await deleteDevice(device.id);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus(`${label} removed.`);
    await load();
  }

  return (
    <AccountSettingsFrame
      title="Device"
      lead="Manage registered phones and hubs"
      backTo="/account-settings"
      wide
    >
      {loading ? <p className="settings-status">Loading devices…</p> : null}
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
      <section className="community-panel" aria-labelledby="devices-title">
        <div className="community-panel__head">
          <h2 className="community-panel__title" id="devices-title">
            Registered devices
          </h2>
          <span className="community-panel__count">{devices.length}</span>
        </div>
        {devices.length === 0 && !loading ? (
          <p className="community-panel__empty">No phones or hubs are registered.</p>
        ) : (
          <ul className="community-list" role="list">
            {devices.map((device) => {
              const current =
                String(device.hid).trim().toUpperCase() === webHid.toUpperCase();
              const session = isSessionHid(device.hid);
              const busy = pendingId === String(device.id);
              const online = isOnline(device);
              return (
                <li key={String(device.id)}>
                  <div className="community-list__item member-row">
                    <span className="community-list__row">
                      <span className="community-list__name">
                        {device.name || device.hid}
                        {current ? <span className="community-list__you">This browser</span> : null}
                      </span>
                      <span className="settings-row-actions">
                        {session && online ? (
                          <button
                            className="btn btn--compact btn--outline"
                            type="button"
                            disabled={busy}
                            onClick={() => void signOut(device)}
                          >
                            {busy ? "Saving…" : "Sign out"}
                          </button>
                        ) : null}
                        {current ? null : (
                          <button
                            className="btn btn--compact btn--outline dash-danger"
                            type="button"
                            disabled={busy}
                            onClick={() => void remove(device)}
                          >
                            Remove
                          </button>
                        )}
                      </span>
                    </span>
                    <span className="community-list__meta">
                      {[
                        session ? "Phone or browser" : "Smart-home hub",
                        online ? "Online" : "Offline",
                        device.enable_notification === false ? "Notifications off" : "Notifications on",
                        ownerLabel(device),
                        `Last seen ${formatSeen(device.last_seen)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AccountSettingsFrame>
  );
}
