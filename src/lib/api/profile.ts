import { request, type ApiResult } from "./client";
import type { AuthUser } from "./auth";

export type OwnerProfileUpdate = {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone?: string | null;
  address?: string;
  avatar_url?: string | null;
};

export type RemoteAppSettings = {
  broadcastName?: string;
  address?: string;
  sharedNotification?: {
    hid?: string;
    networkId?: string;
    apiKey?: string;
    webhook?: string;
    periodicalCheckSec?: string;
  };
  smartHomeDevices?: Array<{ hid: string; name?: string; active?: boolean }>;
  quickMessages?: Record<string, string>;
  memberJoinWelcome?: string;
};

export const DEFAULT_REMOTE_APP_SETTINGS: Required<
  Pick<
    RemoteAppSettings,
    | "broadcastName"
    | "address"
    | "sharedNotification"
    | "quickMessages"
    | "memberJoinWelcome"
  >
> = {
  broadcastName: "",
  address: "",
  sharedNotification: {
    hid: "",
    networkId: "",
    apiKey: "",
    webhook: "",
    periodicalCheckSec: "86400",
  },
  quickMessages: {
    PANIC: "PANIC! Immediate assistance required at my location.",
    SENSOR: "Sensor triggered in my zone. Please verify.",
    NS_PANIC:
      "Non-specific alert: suspicious activity reported in the area. Sender identity withheld (anti-retaliation).",
    UNKNOWN: "Unknown alert reported in the zone.",
    WELLNESS_CHECK: "Wellness check: please confirm you are safe and well.",
  },
  memberJoinWelcome: "",
};

export function mergeRemoteAppSettings(
  raw?: RemoteAppSettings | null,
): RemoteAppSettings {
  return {
    ...DEFAULT_REMOTE_APP_SETTINGS,
    ...(raw ?? {}),
    sharedNotification: {
      ...DEFAULT_REMOTE_APP_SETTINGS.sharedNotification,
      ...(raw?.sharedNotification ?? {}),
    },
    quickMessages: {
      ...DEFAULT_REMOTE_APP_SETTINGS.quickMessages,
      ...(raw?.quickMessages ?? {}),
    },
  };
}

export type UsernameAvailableResult = {
  username: string;
  available: boolean;
  message: string;
};

export async function updateOwnerProfile(
  ownerId: string | number,
  payload: OwnerProfileUpdate,
): Promise<ApiResult<AuthUser>> {
  return request<AuthUser>({
    method: "PATCH",
    path: `/owners/${encodeURIComponent(String(ownerId))}`,
    body: payload,
  });
}

export async function uploadProfileAvatar(
  imageDataUrl: string,
): Promise<ApiResult<{ avatar_url: string }>> {
  return request<{ avatar_url: string }>({
    method: "POST",
    path: "/me/avatar",
    body: { image: imageDataUrl },
  });
}

export async function getRemoteAppSettings(): Promise<
  ApiResult<RemoteAppSettings>
> {
  return request<RemoteAppSettings>({
    method: "GET",
    path: "/me/settings",
  });
}

export async function updateRemoteAppSettings(
  payload: RemoteAppSettings,
): Promise<ApiResult<RemoteAppSettings>> {
  return request<RemoteAppSettings>({
    method: "PUT",
    path: "/me/settings",
    body: payload,
  });
}

export async function checkUsernameAvailable(username: string) {
  const trimmed = username.trim().toLowerCase();
  const result = await request<UsernameAvailableResult>({
    method: "GET",
    path: "/utils/username-available",
    params: { username: trimmed },
    auth: false,
  });
  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ?? "Could not verify username availability.",
    };
  }
  return {
    data: result.data,
    error: result.data.available
      ? null
      : result.data.message || "Username is already taken",
  };
}
