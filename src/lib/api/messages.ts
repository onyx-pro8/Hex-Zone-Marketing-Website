import { request } from "./client";

const DEVICE_HID_KEY = "szp_marketing_device_hid";

export type MessageType =
  | "SENSOR"
  | "PANIC"
  | "NS_PANIC"
  | "UNKNOWN"
  | "PRIVATE"
  | "PA"
  | "SERVICE"
  | "WELLNESS_CHECK";

export type MessagePosition = {
  latitude: number;
  longitude: number;
};

export type ComposeZoneOption = {
  zone_record_id: number;
  zone_id: string;
  name: string | null;
  label: string;
  tier: string;
};

export type PrivateSearchMember = {
  id: number;
  display_name: string;
  broadcast_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  zone_id: string | null;
  subtitle: string;
};

export type PrivateLocationStatus =
  | "inside_zone"
  | "outside_zone"
  | "no_coordinates"
  | "not_in_network";

export type PropagationResult = {
  id?: string | null;
  skipped?: boolean;
  reason?: string | null;
  delivered_owner_ids?: number[];
  zone_ids?: string[];
};

function readObject<T>(data: unknown): T | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as T;
}

export function getOrCreateWebHid(): string {
  try {
    const existing = localStorage.getItem(DEVICE_HID_KEY);
    if (existing) return existing;
    const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    const next = `WEB-${suffix}`;
    localStorage.setItem(DEVICE_HID_KEY, next);
    return next;
  } catch {
    return `WEB-${Date.now().toString(36).toUpperCase()}`;
  }
}

export async function listComposeZones(position?: MessagePosition) {
  const result = await request<unknown>({
    method: "GET",
    path: "/message-feature/compose/zones",
    params: position
      ? { latitude: position.latitude, longitude: position.longitude }
      : undefined,
  });
  const body = readObject<{ zones?: ComposeZoneOption[] }>(result.data);
  const zones = Array.isArray(result.data)
    ? (result.data as ComposeZoneOption[])
    : (body?.zones ?? []);
  return { ...result, data: { zones } };
}

export async function searchPrivateMessageRecipients(
  query: string,
  position?: MessagePosition,
  zoneRecordId?: number,
) {
  const result = await request<unknown>({
    method: "GET",
    path: "/message-feature/members/search",
    params: {
      q: query.trim(),
      ...(position
        ? { latitude: position.latitude, longitude: position.longitude }
        : {}),
      ...(zoneRecordId != null ? { zone_record_id: zoneRecordId } : {}),
    },
  });
  const body = readObject<{
    members?: PrivateSearchMember[];
    location_status?: PrivateLocationStatus;
    zone_ids?: string[];
  }>(result.data);
  return {
    ...result,
    data: {
      members: body?.members ?? [],
      location_status: body?.location_status ?? null,
      zone_ids: body?.zone_ids ?? [],
    },
  };
}

export async function listComposeZoneRecipients(params: {
  zoneRecordId?: number | null;
  type: MessageType;
  position?: MessagePosition;
  query?: string;
}) {
  const result = await request<unknown>({
    method: "GET",
    path: "/message-feature/compose/recipients",
    params: {
      ...(params.zoneRecordId != null
        ? { zone_record_id: params.zoneRecordId }
        : {}),
      type: params.type,
      q: params.query?.trim() ?? "",
      ...(params.position
        ? {
            latitude: params.position.latitude,
            longitude: params.position.longitude,
          }
        : {}),
    },
  });
  const body = readObject<{ members?: PrivateSearchMember[] }>(result.data);
  return {
    ...result,
    data: { members: body?.members ?? [] },
  };
}

export async function propagateMessage(payload: {
  type: MessageType;
  hid: string;
  msg: Record<string, unknown>;
  position?: MessagePosition;
  receiver_owner_id?: number;
  zone_record_id?: number;
  zone_record_ids?: number[];
}) {
  return request<PropagationResult>({
    method: "POST",
    path: "/message-feature/messages/propagate",
    body: payload,
  });
}
