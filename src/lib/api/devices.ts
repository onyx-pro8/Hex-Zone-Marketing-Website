import { request } from "./client";

export type DeviceOwner = {
  id?: number | string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type DeviceRecord = {
  id: number | string;
  hid: string;
  name?: string;
  address?: string;
  owner_id?: number | string;
  owner?: DeviceOwner | null;
  active?: boolean;
  is_online?: boolean;
  last_seen?: string;
  enable_notification?: boolean;
  webhook?: string;
  periodical_check_sec?: string;
  zone_ids?: number[];
  created_at?: string;
  updated_at?: string;
};

export type CreateDevicePayload = {
  hid: string;
  name: string;
  address?: string;
  webhook?: string;
  periodical_check_sec?: string;
  zone_ids?: number[];
  enable_notification?: boolean;
  propagate_enabled?: boolean;
  is_online?: boolean;
  active?: boolean;
};

export async function getDevices() {
  const result = await request<unknown>({ method: "GET", path: "/devices/" });
  const data = result.data;
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { devices?: unknown }).devices)
      ? (data as { devices: unknown[] }).devices
      : [];
  return {
    ...result,
    data: rows.filter(
      (row): row is DeviceRecord =>
        Boolean(row) && typeof row === "object" && "hid" in (row as object),
    ),
  };
}

export async function createDevice(payload: CreateDevicePayload) {
  return request<DeviceRecord>({
    method: "POST",
    path: "/devices/",
    body: {
      address: payload.address ?? "Unknown",
      latitude: 0,
      longitude: 0,
      propagate_enabled: payload.propagate_enabled ?? true,
      propagate_radius_km: 2.5,
      enable_notification: payload.enable_notification ?? true,
      alert_threshold_meters: 100,
      update_interval_seconds: 60,
      active: payload.active ?? true,
      status: true,
      is_online: payload.is_online ?? false,
      hid: payload.hid,
      name: payload.name,
      ...(payload.webhook != null ? { webhook: payload.webhook } : {}),
      ...(payload.periodical_check_sec != null
        ? { periodical_check_sec: payload.periodical_check_sec }
        : {}),
      ...(payload.zone_ids != null ? { zone_ids: payload.zone_ids } : {}),
    },
  });
}

export async function updateDevice(
  deviceId: number | string,
  payload: Partial<
    Pick<
      DeviceRecord,
      | "name"
      | "address"
      | "is_online"
      | "enable_notification"
      | "active"
      | "webhook"
      | "periodical_check_sec"
      | "zone_ids"
    >
  >,
) {
  return request<DeviceRecord>({
    method: "PATCH",
    path: `/devices/${encodeURIComponent(String(deviceId))}`,
    body: payload,
  });
}

export async function deleteDevice(deviceId: number | string) {
  return request<{ success?: boolean }>({
    method: "DELETE",
    path: `/devices/${encodeURIComponent(String(deviceId))}`,
  });
}
