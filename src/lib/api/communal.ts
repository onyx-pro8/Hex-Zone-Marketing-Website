import { request } from "./client";

export type CommunalIdRow = {
  reference_id: string;
  creator_id?: number | null;
  creator_name?: string | null;
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
