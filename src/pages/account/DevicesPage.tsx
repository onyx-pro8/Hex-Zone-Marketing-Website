import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { useAuth } from "../../auth/useAuth";
import {
  createDevice,
  deleteDevice,
  getDevices,
  updateDevice,
  type DeviceRecord,
} from "../../lib/api/devices";
import { getOrCreateWebHid } from "../../lib/api/messages";
import { getRemoteAppSettings } from "../../lib/api/profile";
import { getZones, type SavedZone } from "../../lib/api/zones";
import { normalizeAccountType } from "../../lib/privateAccount";

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

function deviceLimit(type: string, tierLevel?: number | null): number {
  if (type === "PRIVATE") return Number.POSITIVE_INFINITY;
  if (type === "PRIVATE_PLUS") return 10;
  if (type === "EXCLUSIVE") return 0;
  if (type === "ENHANCED") return 1;
  const level = tierLevel != null && tierLevel >= 1 && tierLevel <= 5 ? tierLevel : 1;
  return ({ 1: 25, 2: 50, 3: 100, 4: 250, 5: 500 } as Record<number, number>)[level] ?? 25;
}

function deviceLimitHint(type: string): string {
  if (type === "PRIVATE") {
    return "Private accounts have unlimited smart-home hubs. Phones and browsers register separately as login sessions.";
  }
  if (type === "PRIVATE_PLUS") {
    return "Family accounts allow 10 smart-home hubs. Phones and browsers are separate login sessions.";
  }
  if (type === "EXCLUSIVE") {
    return "Individual accounts do not support smart-home hubs. Phones and browsers still register as login sessions.";
  }
  if (type === "ENHANCED") {
    return "Individual Pro accounts allow 1 smart-home hub.";
  }
  return "Organization accounts can register smart-home hubs up to the plan limit. Phones and browsers are separate login sessions.";
}

function generateSmartHomeHid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return `DEV-${suffix}`;
}

function normalizeSmartHomeHid(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.startsWith("MOB-") || upper.startsWith("WEB-")) return null;
  const suffix = (upper.startsWith("DEV-") ? upper.slice(4) : upper).replace(/[^A-Z0-9]/g, "");
  if (suffix.length < 3) return null;
  return `DEV-${suffix}`;
}

type HubDraft = {
  name: string;
  hid: string;
  address: string;
  webhook: string;
  periodicalCheckSec: string;
  zoneIds: number[];
};

function emptyHubDraft(): HubDraft {
  return {
    name: "",
    hid: generateSmartHomeHid(),
    address: "",
    webhook: "",
    periodicalCheckSec: "86400",
    zoneIds: [],
  };
}

function zoneRecordId(zone: SavedZone): number | null {
  const id = Number(zone.id);
  return Number.isFinite(id) ? id : null;
}

export function DevicesPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [zones, setZones] = useState<SavedZone[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [draft, setDraft] = useState<HubDraft>(emptyHubDraft);
  const [savingHub, setSavingHub] = useState(false);
  const webHid = useMemo(() => getOrCreateWebHid(), []);
  const accountType = normalizeAccountType(user?.accountType ?? user?.account_type);
  const smartHomeEnabled = deviceLimit(accountType, user?.tierLevel ?? user?.tier_level) > 0;
  const networkId = String(user?.zoneId ?? user?.zone_id ?? "").trim();
  const ownerId = user?.id != null ? String(user.id) : "";

  async function load() {
    setLoading(true);
    const result = await getDevices();
    setLoading(false);
    if (result.error) setError(result.error);
    setDevices(result.data ?? []);
  }

  useEffect(() => {
    void load();
    void getZones().then((result) => setZones(result.data ?? []));
    void getRemoteAppSettings().then((result) => {
      const key = result.data?.sharedNotification?.apiKey;
      if (typeof key === "string") setApiKey(key);
    });
  }, []);

  const hubCount = useMemo(
    () =>
      devices.filter((device) => {
        if (isSessionHid(device.hid)) return false;
        if (!ownerId || device.owner_id == null) return true;
        return String(device.owner_id) === ownerId;
      }).length,
    [devices, ownerId],
  );
  const hubCap = deviceLimit(accountType, user?.tierLevel ?? user?.tier_level);
  const atHubLimit = Number.isFinite(hubCap) && hubCount >= hubCap;

  function openAddHub() {
    setEditingId(null);
    setDraft(emptyHubDraft());
    setError("");
    setHubOpen(true);
  }

  function openEditHub(device: DeviceRecord) {
    setEditingId(device.id);
    setDraft({
      name: device.name ?? "",
      hid: device.hid,
      address: device.address ?? "",
      webhook: device.webhook ?? "",
      periodicalCheckSec: device.periodical_check_sec || "86400",
      zoneIds: (device.zone_ids ?? []).map((id) => Number(id)).filter(Number.isFinite),
    });
    setError("");
    setHubOpen(true);
  }

  async function saveHub() {
    if (!draft.webhook.trim()) {
      setError("Enter the webhook URL for this hub.");
      return;
    }
    if (draft.zoneIds.length === 0) {
      setError("Select at least one zone for this hub.");
      return;
    }
    const binding = {
      webhook: draft.webhook.trim(),
      periodical_check_sec: draft.periodicalCheckSec.trim() || "86400",
      zone_ids: draft.zoneIds,
    };
    setSavingHub(true);
    setError("");
    setStatus("");
    if (editingId != null) {
      const label = draft.name.trim();
      if (!label) {
        setSavingHub(false);
        setError("Enter a device name.");
        return;
      }
      const result = await updateDevice(editingId, {
        name: label,
        address: draft.address.trim() || undefined,
        ...binding,
      });
      setSavingHub(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setHubOpen(false);
      setStatus("Smart-home device updated.");
      await load();
      return;
    }
    const hid = normalizeSmartHomeHid(draft.hid);
    if (!hid) {
      setSavingHub(false);
      setError("Enter a valid HID (DEV- plus at least 3 letters or numbers).");
      return;
    }
    if (devices.some((device) => String(device.hid).toUpperCase() === hid)) {
      setSavingHub(false);
      setError("This Device ID is already in use.");
      return;
    }
    if (atHubLimit) {
      setSavingHub(false);
      setError(deviceLimitHint(accountType));
      return;
    }
    const label =
      draft.name.trim() ||
      `${(user?.name?.split(/\s+/)[0] || "Home").replace(/[^a-zA-Z]/g, "") || "Home"} hub`;
    const result = await createDevice({
      hid,
      name: label,
      address: draft.address.trim() || undefined,
      enable_notification: true,
      propagate_enabled: true,
      is_online: false,
      active: true,
      ...binding,
    });
    setSavingHub(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setHubOpen(false);
    setStatus(`${hid} is registered with its webhook and zones.`);
    await load();
  }

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
      <p className="auth-hint">{deviceLimitHint(accountType)}</p>
      {smartHomeEnabled ? (
        <div className="dash-message__bar">
          <button
            className="btn btn--primary"
            type="button"
            disabled={atHubLimit}
            onClick={openAddHub}
          >
            Add smart-home device
          </button>
        </div>
      ) : null}
      {smartHomeEnabled && atHubLimit ? (
        <p className="auth-hint">Smart-home limit reached. Remove a hub to add another.</p>
      ) : null}
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
                        {!session ? (
                          <button
                            className="btn btn--compact btn--outline"
                            type="button"
                            disabled={busy}
                            onClick={() => openEditHub(device)}
                          >
                            Edit
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
      {hubOpen ? (
        <div className="zone-detail-modal" role="presentation" onClick={() => !savingHub && setHubOpen(false)}>
          <section
            className="zone-detail-modal__card dash-card hub-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dash-card__head">
              <h2 className="community-panel__title" id="hub-form-title">
                {editingId != null ? "Edit smart-home device" : "Add smart-home device"}
              </h2>
              <button
                type="button"
                className="ua-modal__close"
                aria-label="Close"
                disabled={savingHub}
                onClick={() => setHubOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="dash-hint">
              Each hub has its own webhook and the zones that should trigger it. Copy the Network ID and API key onto the device.
            </p>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-name">Device name</label>
              <input
                id="hub-name"
                className="auth-input"
                value={draft.name}
                placeholder="Living room hub"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-hid">Hardware ID (HID)</label>
              <input
                id="hub-hid"
                className="auth-input"
                value={draft.hid}
                placeholder="DEV-A1B2C3"
                disabled={editingId != null}
                onChange={(event) => setDraft((current) => ({ ...current, hid: event.target.value.toUpperCase() }))}
              />
              {editingId == null ? (
                <button
                  className="btn btn--compact btn--outline"
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, hid: generateSmartHomeHid() }))}
                >
                  Generate HID
                </button>
              ) : null}
              <p className="auth-hint">
                Use Generate or enter DEV- plus at least 3 letters or numbers. Do not use MOB- or WEB-.
              </p>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-address">Address (optional)</label>
              <input
                id="hub-address"
                className="auth-input"
                value={draft.address}
                placeholder="Home address"
                onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-webhook">Webhook</label>
              <input
                id="hub-webhook"
                className="auth-input"
                value={draft.webhook}
                placeholder="https://hub.example.com/hooks/hex-zone"
                onChange={(event) => setDraft((current) => ({ ...current, webhook: event.target.value }))}
              />
            </div>
            <div className="auth-field">
              <p className="auth-label">Zones</p>
              {zones.length === 0 ? (
                <p className="auth-hint">No zones yet. Create a zone first, then connect this hub to it.</p>
              ) : (
                <div className="hub-zones">
                  {zones.map((zone) => {
                    const id = zoneRecordId(zone);
                    if (id == null) return null;
                    const selected = draft.zoneIds.includes(id);
                    return (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setDraft((current) => ({
                              ...current,
                              zoneIds: selected
                                ? current.zoneIds.filter((zoneId) => zoneId !== id)
                                : [...current.zoneIds, id],
                            }))
                          }
                        />
                        <span>{zone.name?.trim() || `Zone ${id}`}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-network">Network ID</label>
              <input id="hub-network" className="auth-input" value={networkId || "—"} readOnly />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-key">API key</label>
              <input id="hub-key" className="auth-input" value={apiKey || "—"} readOnly />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="hub-check">Periodical check (sec)</label>
              <input
                id="hub-check"
                className="auth-input"
                inputMode="numeric"
                value={draft.periodicalCheckSec}
                placeholder="86400"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, periodicalCheckSec: event.target.value }))
                }
              />
            </div>
            <button
              className="btn btn--primary"
              type="button"
              disabled={savingHub}
              onClick={() => void saveHub()}
            >
              {savingHub ? "Saving…" : editingId != null ? "Save changes" : "Save smart-home device"}
            </button>
          </section>
        </div>
      ) : null}
    </AccountSettingsFrame>
  );
}
