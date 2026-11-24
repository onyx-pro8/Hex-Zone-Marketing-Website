import { request } from "./client";

export type UniversalAccessZone = {
  id: number;
  name: string;
  zone_type?: string;
};

export type UniversalAccessKeyRow = {
  credential_id: number;
  code: string;
  key_type: string;
  zone_ids?: number[];
  zones?: UniversalAccessZone[];
  enabled?: boolean;
};

function asKeyList(data: unknown): UniversalAccessKeyRow[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { keys?: unknown }).keys)
      ? (data as { keys: unknown[] }).keys
      : [];
  return rows.filter(
    (row): row is UniversalAccessKeyRow =>
      Boolean(row) &&
      typeof row === "object" &&
      typeof (row as UniversalAccessKeyRow).code === "string" &&
      Number.isFinite(Number((row as UniversalAccessKeyRow).credential_id)),
  );
}

export async function listPrivateUniversalAccessKeys() {
  const result = await request<unknown>({
    method: "GET",
    path: "/universal-access/keys/private",
  });
  return { ...result, data: asKeyList(result.data) };
}

export async function searchPublicUniversalAccessKeys(query: string) {
  const result = await request<unknown>({
    method: "GET",
    path: "/universal-access/keys/public",
    params: { q: query },
  });
  return { ...result, data: asKeyList(result.data) };
}

export async function sendUniversalAccessKey(credentialId: number) {
  return request<UniversalAccessKeyRow>({
    method: "POST",
    path: "/universal-access/keys/send",
    body: { credential_id: credentialId },
  });
}
