import { request } from "./client";

export const GUEST_ARRIVAL_MESSAGE_MAX_LEN = 500;

export const GUEST_ARRIVAL_FALLBACK_DEFAULTS = {
  expected_arrival_message: "You are expected. Please proceed.",
  unexpected_arrival_message: "You are not scheduled. Please wait for approval.",
};

export type GuestArrivalMessages = {
  zone_id: string;
  expected_arrival_message: string | null;
  unexpected_arrival_message: string | null;
  defaults: {
    expected_arrival_message: string;
    unexpected_arrival_message: string;
  };
};

function readOverride(record: Record<string, unknown>, key: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return null;
  const value = record[key];
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalize(data: unknown, zoneId: string): GuestArrivalMessages | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  const defaultsRow =
    row.defaults && typeof row.defaults === "object" && !Array.isArray(row.defaults)
      ? (row.defaults as Record<string, unknown>)
      : {};
  return {
    zone_id: String(row.zone_id ?? zoneId),
    expected_arrival_message: readOverride(row, "expected_arrival_message"),
    unexpected_arrival_message: readOverride(row, "unexpected_arrival_message"),
    defaults: {
      expected_arrival_message:
        (typeof defaultsRow.expected_arrival_message === "string" &&
          defaultsRow.expected_arrival_message.trim()) ||
        GUEST_ARRIVAL_FALLBACK_DEFAULTS.expected_arrival_message,
      unexpected_arrival_message:
        (typeof defaultsRow.unexpected_arrival_message === "string" &&
          defaultsRow.unexpected_arrival_message.trim()) ||
        GUEST_ARRIVAL_FALLBACK_DEFAULTS.unexpected_arrival_message,
    },
  };
}

export function normalizeGuestArrivalMessageField(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > GUEST_ARRIVAL_MESSAGE_MAX_LEN) {
    throw new Error(
      `Messages must be at most ${GUEST_ARRIVAL_MESSAGE_MAX_LEN} characters.`,
    );
  }
  return trimmed;
}

function pathFor(zoneId: string): string {
  return `/api/access/zones/${encodeURIComponent(zoneId.trim())}/guest-arrival-messages`;
}

export async function getGuestArrivalMessages(zoneId: string) {
  const result = await request<unknown>({ method: "GET", path: pathFor(zoneId) });
  if (result.error || !result.data) return { data: null, error: result.error };
  const parsed = normalize(result.data, zoneId);
  return {
    data: parsed,
    error: parsed ? null : "Unexpected response from server.",
  };
}

export async function updateGuestArrivalMessages(
  zoneId: string,
  payload: {
    expected_arrival_message: string | null;
    unexpected_arrival_message: string | null;
  },
) {
  const result = await request<unknown>({
    method: "PATCH",
    path: pathFor(zoneId),
    body: payload,
  });
  if (result.error || !result.data) return { data: null, error: result.error };
  const parsed = normalize(result.data, zoneId);
  return {
    data: parsed,
    error: parsed ? null : "Unexpected response from server.",
  };
}
