import { API_BASE_URL, request } from "./api/client";
import { getOrCreateWebHid } from "./api/messages";

type DeviceRow = {
  id?: number;
  hid?: string;
};

let sessionDeviceId: number | null = null;
let createBlocked = false;

function sameHid(row: DeviceRow, hid: string): boolean {
  return String(row.hid ?? "").trim().toUpperCase() === hid.toUpperCase();
}

/** Register this browser and refresh presence so other clients see the account online. */
export async function ensureWebSessionOnline(): Promise<void> {
  const hid = getOrCreateWebHid();
  if (sessionDeviceId == null) {
    const listed = await request<DeviceRow[]>({ method: "GET", path: "/devices/" });
    const existing = (listed.data ?? []).find((row) => sameHid(row, hid));
    if (existing?.id != null) {
      sessionDeviceId = existing.id;
    } else if (!createBlocked) {
      const created = await request<DeviceRow>({
        method: "POST",
        path: "/devices/",
        body: {
          hid,
          name: "Web",
          is_online: true,
          enable_notification: true,
          propagate_enabled: true,
        },
      });
      if (created.data?.id != null) sessionDeviceId = created.data.id;
      else if (created.error && /already in use|already exists/i.test(created.error)) {
        createBlocked = true;
      }
    }
  }
  if (sessionDeviceId == null) return;
  await request({ method: "POST", path: `/devices/${sessionDeviceId}/heartbeat` });
}

/** Mark this browser session offline. Uses the token captured before logout clears storage. */
export async function markWebSessionOffline(token: string): Promise<void> {
  const id = sessionDeviceId;
  sessionDeviceId = null;
  createBlocked = false;
  if (id == null || !token) return;
  try {
    await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/devices/${id}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_online: false }),
      keepalive: true,
    });
  } catch {
    /* The socket close still publishes offline. */
  }
}
