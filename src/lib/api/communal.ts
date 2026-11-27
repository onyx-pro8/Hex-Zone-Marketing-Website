import { request } from "./client";

export type CommunalIdRow = {
  reference_id: string;
  creator_id?: number | null;
  creator_name?: string | null;
  creator_broadcast_name?: string | null;
  network_id: string;
  zone_count: number;
  created_at?: string | null;
};

export type CommunalValidateResult = {
  valid: boolean;
  zone_type: string;
  reference_id: string;
  display_name?: string | null;
  message?: string | null;
  exists?: boolean | null;
  zones?: Array<{ id: number; name?: string; zone_id?: string }>;
};

export type CommunalZone = {
  id: string | number;
  zone_id?: string | number;
  name?: string;
  type?: string;
  zone_type?: string;
  owner_id?: string | number;
  owner_name?: string | null;
  creator_id?: string | number;
  is_primary?: boolean;
  geometry?: Record<string, unknown>;
  config?: Record<string, unknown>;
  h3_cells?: string[];
  geo_fence_polygon?: unknown;
  shared_via_communal?: boolean;
};

/** Public Communal IDs that already have zones (Individual signup). */
export async function listCommunalIdsPublic() {
  return request<CommunalIdRow[]>({
    method: "GET",
    path: "/zones/communal-ids/public",
    auth: false,
  });
}

export async function validateCommunalIdPublic(referenceId: string) {
  return request<CommunalValidateResult>({
    method: "POST",
    path: "/zones/validate-reference/public",
    body: {
      zone_type: "communal_id",
      reference_id: referenceId.trim().toUpperCase(),
    },
    auth: false,
  });
}

/** Authenticated registry of Communal IDs (all networks). */
export async function listCommunalIds() {
  return request<CommunalIdRow[]>({
    method: "GET",
    path: "/zones/communal-ids",
  });
}

/** Zones tagged with a Communal ID (may include other networks). */
export async function listZonesForCommunalId(referenceId: string) {
  const id = referenceId.trim().toUpperCase();
  return request<CommunalZone[]>({
    method: "GET",
    path: `/zones/communal-ids/${encodeURIComponent(id)}/zones`,
  });
}

/** Individual accounts that joined this Communal ID at signup. */
export type CommunalJoinedMember = {
  id: string;
  name: string;
  broadcast_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  address?: string | null;
  zone_id?: string | null;
  role?: string | null;
  account_type?: string | null;
  active?: boolean;
  online?: boolean;
  avatar_url?: string | null;
  communal_id: string;
  location?: { latitude: number; longitude: number } | null;
  lastSeen?: string | null;
};

export async function listMembersForCommunalId(referenceId: string) {
  const id = referenceId.trim().toUpperCase();
  return request<CommunalJoinedMember[]>({
    method: "GET",
    path: `/zones/communal-ids/${encodeURIComponent(id)}/members`,
  });
}
