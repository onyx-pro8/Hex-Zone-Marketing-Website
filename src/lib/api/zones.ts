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
  const result = await request<unknown>({ method: "GET", path: "/zones" });
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
