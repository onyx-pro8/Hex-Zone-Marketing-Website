import { request } from "./client";

export type Member = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  zone_id?: string;
  account_type?: string;
  location?: { latitude: number; longitude: number } | null;
  zones?: string[];
  role?: "administrator" | "user" | string;
  active?: boolean;
  online?: boolean;
  avatar_url?: string | null;
  lastSeen?: string | null;
};

function readCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readLocation(raw: Record<string, unknown>): Member["location"] {
  const nested =
    raw.location && typeof raw.location === "object"
      ? (raw.location as Record<string, unknown>)
      : null;
  const lat = readCoord(
    nested?.latitude ?? nested?.lat ?? raw.latitude ?? raw.lat,
  );
  const lng = readCoord(
    nested?.longitude ?? nested?.lng ?? nested?.lon ?? raw.longitude ?? raw.lng,
  );
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function normalizeMember(raw: unknown): Member | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  const name = row.name ?? row.first_name ?? row.username ?? row.email;
  if (id == null || (typeof name !== "string" && name == null)) return null;

  const rawZoneId = row.zone_id ?? row.zoneId;
  return {
    id: String(id),
    name:
      typeof name === "string"
        ? name
        : `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
          String(row.username ?? row.email ?? "Member"),
    username:
      typeof row.username === "string" && row.username.trim()
        ? row.username.trim().toLowerCase()
        : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    first_name:
      typeof row.first_name === "string" ? row.first_name : undefined,
    last_name: typeof row.last_name === "string" ? row.last_name : undefined,
    address: typeof row.address === "string" ? row.address : undefined,
    zone_id:
      typeof rawZoneId === "string"
        ? rawZoneId
        : rawZoneId != null
          ? String(rawZoneId)
          : undefined,
    account_type:
      typeof row.account_type === "string"
        ? row.account_type
        : typeof row.accountType === "string"
          ? row.accountType
          : undefined,
    location: readLocation(row),
    zones: Array.isArray(row.zones)
      ? row.zones.filter((z): z is string => typeof z === "string")
      : [],
    role: typeof row.role === "string" ? row.role : undefined,
    active: typeof row.active === "boolean" ? row.active : true,
    online: typeof row.online === "boolean" ? row.online : false,
    avatar_url:
      typeof row.avatar_url === "string"
        ? row.avatar_url
        : typeof row.avatarUrl === "string"
          ? row.avatarUrl
          : null,
    lastSeen:
      typeof row.lastSeen === "string"
        ? row.lastSeen
        : typeof row.last_seen === "string"
          ? row.last_seen
          : null,
  };
}

export async function getMembers() {
  const result = await request<unknown[]>({ method: "GET", path: "/members" });
  return {
    ...result,
    data: (result.data ?? [])
      .map(normalizeMember)
      .filter((member): member is Member => Boolean(member)),
  };
}

export async function updateMemberLocation(payload: {
  latitude: number;
  longitude: number;
}) {
  return request<{ latitude: number; longitude: number; zones?: string[] }>({
    method: "POST",
    path: "/members/location",
    body: payload,
  });
}
