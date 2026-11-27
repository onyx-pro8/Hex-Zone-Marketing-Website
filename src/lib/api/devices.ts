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
  created_at?: string;
  updated_at?: string;
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

export async function updateDevice(
  deviceId: number | string,
  payload: Partial<Pick<DeviceRecord, "name" | "is_online" | "enable_notification" | "active">>,
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
