export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://safe-zone-patrol-server.onrender.com";

const TOKEN_KEY = "szp_marketing_token";
const REMEMBER_KEY = "szp_marketing_remember";
const LAST_EMAIL_KEY = "szp_marketing_last_email";

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ApiEnvelope<T> = {
  status: "success" | "error";
  data: T;
  error?: { message?: string } | null;
  message?: string;
};

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function persistToken(token: string, rememberMe: boolean): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");
    if (rememberMe) localStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore storage failures */
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

export function persistLastEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(LAST_EMAIL_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function clearLastEmail(): void {
  try {
    localStorage.removeItem(LAST_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function normalizeApiData<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === "object" &&
    "status" in raw &&
    "data" in raw &&
    (raw as Record<string, unknown>).status === "success"
  ) {
    return (raw as ApiEnvelope<T>).data;
  }
  return raw as T;
}

function normalizeEnvelopeError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || !("status" in raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.status !== "error") return null;
  const topMsg = typeof row.message === "string" ? row.message.trim() : "";
  const nested =
    row.error && typeof row.error === "object" && row.error !== null
      ? String((row.error as { message?: string }).message ?? "").trim()
      : "";
  return topMsg || nested || "Request failed";
}

function readResponseDetail(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail.trim();
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: unknown }).msg ?? "").trim();
        }
        if (item && typeof item === "object" && "message" in item) {
          return String((item as { message?: unknown }).message ?? "").trim();
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof detail === "object" && detail !== null && "message" in detail) {
    return String((detail as { message?: unknown }).message ?? "").trim();
  }
  return "";
}

function toErrorMessage(status: number | undefined, body: unknown, fallback: string): string {
  const envelopeError = normalizeEnvelopeError(body);
  if (envelopeError) {
    if (status === 401) return `${envelopeError} Please sign in again.`;
    return envelopeError;
  }
  const detail =
    readResponseDetail(body) ||
    (body && typeof body === "object" && "message" in body
      ? String((body as { message?: unknown }).message ?? "").trim()
      : "");
  const base = detail || fallback || "Request failed";
  if (status === 401) return `${base} Please sign in again.`;
  return base;
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function request<T>(options: RequestOptions): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  const url = new URL(
    options.path.startsWith("http")
      ? options.path
      : `${API_BASE_URL.replace(/\/+$/, "")}/${options.path.replace(/^\/+/, "")}`,
  );
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    let raw: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        raw = text;
      }
    }

    if (!response.ok) {
      return {
        data: null,
        error: toErrorMessage(
          response.status,
          raw,
          response.statusText || "Request failed",
        ),
      };
    }

    return { data: normalizeApiData<T>(raw), error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    return { data: null, error: message };
  }
}
