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
  sharedNotification?: Record<string, unknown>;
  smartHomeDevices?: Array<{ hid: string; name?: string; active?: boolean }>;
  quickMessages?: Record<string, unknown>;
  memberJoinWelcome?: string;
};

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
