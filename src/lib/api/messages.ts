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

/** Home inbox vs Incoming alarms, matching the mobile tabs. */
export type InboxLane = "home" | "alarm";

export type InboxMessage = {
  id: string;
  type: string;
  lane: InboxLane;
  body: string;
  subject: string | null;
  zoneId: string;
  zoneLabel: string;
  senderId: number | null;
  senderName: string;
  senderOnline: boolean | null;
  createdAt: string;
};

const ALARM_TYPES = new Set([
  "SENSOR",
  "PANIC",
  "NS_PANIC",
  "UNKNOWN",
  "WELLNESS_CHECK",
]);

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readTime(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return "";
}

function extractMessageRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const row = data as Record<string, unknown>;
  for (const key of ["items", "messages", "results", "data"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

function laneForType(type: string): InboxLane | null {
  const upper = type.toUpperCase();
  if (upper === "PERMISSION") return null;
  if (ALARM_TYPES.has(upper)) return "alarm";
  return "home";
}

function normalizeInboxMessage(raw: unknown): InboxMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = (readText(row.type) || readText(row.message_type) || "MESSAGE").toUpperCase();
  const lane = laneForType(type);
  if (!lane) return null;
  const senderRaw = Number(row.sender_id ?? row.senderId);
  const senderId = Number.isFinite(senderRaw) && senderRaw > 0 ? Math.trunc(senderRaw) : null;
  const msg =
    row.msg && typeof row.msg === "object" && !Array.isArray(row.msg)
      ? (row.msg as Record<string, unknown>)
      : null;
  const subject = readText(row.subject) || readText(msg?.subject) || null;
  const description = readText(msg?.description);
  const bodyText = readText(row.message) || readText(row.text) || description;
  const body = subject && bodyText === subject && description ? description : bodyText;
  const zoneId = readText(row.zone_id) || readText(row.zoneId);
  const zoneLabel =
    readText(row.relevant_zone_label) ||
    readText(row.relevantZoneLabel) ||
    readText(row.relevant_zone_name) ||
    zoneId ||
    "Zone";
  const createdAt = readTime(row.created_at) || readTime(row.createdAt);
  const id = row.id == null ? "" : String(row.id);
  if (!id || !createdAt) return null;
  return {
    id,
    type,
    lane,
    body: body || subject || "",
    subject: subject && subject !== body ? subject : null,
    zoneId: zoneId || zoneLabel,
    zoneLabel,
    senderId,
    senderName: readText(row.broadcast_name) || readText(row.broadcastName),
    senderOnline: typeof row.sender_online === "boolean" ? row.sender_online : null,
    createdAt,
  };
}

/** Inbox for this account: mobile Home messages plus incoming alarms. */
export async function listInboxMessages(ownerId: number) {
  const messages: InboxMessage[] = [];
  let error: string | null = null;
  const pageSize = 100;
  for (let page = 0; page < 6; page += 1) {
    const result = await request<unknown>({
      method: "GET",
      path: `/messages?owner_id=${encodeURIComponent(String(ownerId))}&skip=${page * pageSize}&limit=${pageSize}`,
    });
    if (result.error) {
      error = result.error;
      break;
    }
    const rows = extractMessageRows(result.data);
    for (const row of rows) {
      const message = normalizeInboxMessage(row);
      if (message) messages.push(message);
    }
    if (rows.length < pageSize) break;
    if (messages.length >= 60) break;
  }
  messages.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { messages, error };
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
