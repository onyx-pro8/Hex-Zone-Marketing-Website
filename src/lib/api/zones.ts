import type { CommunalZone } from "./communal";
import { request } from "./client";

export type SavedZone = CommunalZone & {
  description?: string;
};

export type CreateZonePayload = {
  name: string;
  description?: string;
  type: string;
  zone_type?: string;
  id?: string;
  zone_id?: string;
  geometry?: Record<string, unknown>;
  config?: Record<string, unknown>;
  h3_cells?: string[];
  geo_fence_polygon?: Record<string, unknown> | null;
  is_primary?: boolean;
};

export type UpdateZonePayload = Partial<CreateZonePayload>;

function asZoneList(data: unknown): SavedZone[] {
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { zones?: unknown }).zones)
      ? (data as { zones: unknown[] }).zones
      : [];
  return rows.filter(
    (row): row is SavedZone =>
      Boolean(row) && typeof row === "object" && "id" in (row as object),
  );
}

export async function getZones() {
  // Canonical list. GET /zones is the contract list and repeats one zone
  // once per subscriber. GET /zones/ returns each zone a single time.
  const result = await request<unknown>({ method: "GET", path: "/zones/" });
  return { ...result, data: asZoneList(result.data) };
}

export async function createZone(payload: CreateZonePayload) {
  return request<SavedZone>({ method: "POST", path: "/zones", body: payload });
}

export async function updateZone(id: string | number, payload: UpdateZonePayload) {
  return request<SavedZone>({
    method: "PATCH",
    path: `/zones/${encodeURIComponent(String(id))}`,
    body: payload,
  });
}

export async function deleteZone(id: string | number) {
  return request<null>({
    method: "DELETE",
    path: `/zones/${encodeURIComponent(String(id))}`,
  });
}

export type ZoneCapabilities = {
  can_create_zone: boolean;
  remaining_total?: number;
  remaining_for_role?: number;
  role?: string;
  reason?: string | null;
  max_total?: number;
  max_primary?: number;
  admin_primary_count?: number;
  next_zone_is_primary?: boolean;
  member_secondary_limit?: number;
  can_create_primary?: boolean;
  can_create_secondary?: boolean;
};

export type ZoneAreaBudget = {
  each_zone_m2: number | null;
  total_m2: number | null;
  used_m2: number;
  remaining_total_m2: number | null;
};

export async function getZoneCapabilities() {
  return request<ZoneCapabilities>({ method: "GET", path: "/zones/capabilities" });
}

export async function getZoneAreaBudget(excludeZoneId?: string | number) {
  return request<ZoneAreaBudget>({
    method: "GET",
    path: "/zones/area-budget",
    params: excludeZoneId ? { exclude_zone_id: excludeZoneId } : undefined,
  });
}

export type DynamicZonePreviewResult = {
  infeasible: boolean;
  reason: string | null;
  center: { latitude: number; longitude: number } | null;
  resolved_radius_meters: number | null;
  tight_radius_meters: number | null;
  matched_user_count: number;
  population_size: number;
};

export async function previewDynamicZone(body: {
  target_user_count: number;
  min_radius_meters: number;
  max_radius_meters: number;
  include_self?: boolean;
}) {
  return request<DynamicZonePreviewResult>({
    method: "POST",
    path: "/zones/dynamic/preview",
    body,
  });
}

export type ZoneReferenceResult = {
  valid: boolean;
  zone_type: string;
  reference_id: string;
  display_name?: string | null;
  geometry?: Record<string, unknown>;
  config?: Record<string, unknown>;
  h3_cells?: string[];
  source?: string | null;
  message?: string | null;
  exists?: boolean | null;
  zones?: Array<{ id: number | string; name?: string; type?: string; owner_name?: string | null }>;
};

export async function validateZoneReference(body: Record<string, unknown>) {
  return request<ZoneReferenceResult>({
    method: "POST",
    path: "/zones/validate-reference",
    body,
  });
}

export async function generateZoneReference(body?: {
  reference_id?: string;
  persist?: boolean;
}) {
  return request<ZoneReferenceResult>({
    method: "POST",
    path: "/zones/generate-reference",
    body: {
      zone_type: "communal_id",
      persist: body?.persist ?? true,
      ...(body?.reference_id ? { reference_id: body.reference_id } : {}),
    },
  });
}
