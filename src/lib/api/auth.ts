import {
  clearStoredToken,
  persistToken,
  request,
  type ApiResult,
} from "./client";

export type AccountType =
  | "PRIVATE"
  | "PRIVATE_PLUS"
  | "EXCLUSIVE"
  | "ENHANCED"
  | "ENHANCED_PLUS";

export type RegistrationType = "ADMINISTRATOR" | "USER";
export type UserRole = "administrator" | "user";

export type AuthUser = {
  id: string | number;
  name?: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  accountType?: AccountType;
  registrationType?: RegistrationType;
  accountOwnerId?: number;
  role?: UserRole;
  platform_staff_role?: string | null;
  platformStaffRole?: string | null;
  zoneId?: string;
  zone_id?: string | number;
  account_type?: string;
  registration_type?: string;
  account_owner_id?: number;
  address?: string;
  phone?: string | null;
  active?: boolean;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  communal_id?: string | null;
  communalId?: string | null;
  tier_level?: number | null;
  tierLevel?: number | null;
};

export type LoginPayload = { email: string; password: string };

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  registrationType: RegistrationType;
  accountOwnerId?: number;
  administratorEmail?: string;
  zoneId?: string;
  communalId?: string;
  phone?: string;
  address?: string;
  registrationCode?: string;
  tierLevel?: number;
};

type LoginResponse = { token: string; user: AuthUser };
type LegacyLoginResponse = {
  access_token?: string;
  token?: string;
  user?: AuthUser;
};

type LegacyRegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  account_type: string;
  zone_id?: string;
  communal_id?: string;
  role?: UserRole;
  account_owner_id?: number;
  administrator_email?: string;
  phone?: string;
  address?: string;
  registration_code?: string;
  tier_level?: number;
};

function mapLegacyRegisterPayload(payload: RegisterPayload): LegacyRegisterPayload {
  const [first, ...rest] = payload.name.trim().split(/\s+/);
  const last = rest.join(" ");
  const trimmedCode = payload.registrationCode?.trim();
  const communal = payload.communalId?.trim();
  return {
    email: payload.email,
    password: payload.password,
    first_name: first || payload.name,
    last_name: last,
    account_type: payload.accountType.toLowerCase(),
    zone_id: payload.zoneId,
    ...(communal ? { communal_id: communal.toUpperCase() } : {}),
    role: payload.registrationType === "USER" ? "user" : "administrator",
    account_owner_id: payload.accountOwnerId,
    ...(payload.administratorEmail?.trim()
      ? { administrator_email: payload.administratorEmail.trim() }
      : {}),
    phone: payload.phone,
    address: payload.address,
    ...(trimmedCode ? { registration_code: trimmedCode } : {}),
    ...(payload.accountType === "ENHANCED_PLUS" && payload.tierLevel != null
      ? { tier_level: payload.tierLevel }
      : {}),
  };
}

function normalizeLoginData(
  data: LoginResponse | LegacyLoginResponse | null,
): LoginResponse | null {
  if (!data) return null;
  const row = data as LoginResponse & LegacyLoginResponse;
  const token = row.token || row.access_token;
  if (!token) return null;
  return {
    token,
    user: row.user ?? ({ id: "" } as AuthUser),
  };
}

function parseRegistrationCodePayload(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    return t || null;
  }
  if (typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.data === "string") {
    const t = row.data.trim();
    return t || null;
  }
  const nested =
    row.data && typeof row.data === "object"
      ? (row.data as Record<string, unknown>)
      : null;
  const pick = (obj: Record<string, unknown> | null) => {
    if (!obj) return undefined;
    return obj.registration_code ?? obj.registrationCode ?? obj.code;
  };
  const raw = pick(row) ?? pick(nested);
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || null;
  }
  return null;
}

export async function loginRequest(
  payload: LoginPayload,
  rememberMe = true,
): Promise<ApiResult<LoginResponse>> {
  const primary = await request<LoginResponse>({
    method: "POST",
    path: "/login",
    body: payload,
    auth: false,
  });
  const primaryData = normalizeLoginData(primary.data);
  if (primaryData?.token) {
    persistToken(primaryData.token, rememberMe);
    return { data: primaryData, error: null };
  }

  const legacy = await request<LegacyLoginResponse>({
    method: "POST",
    path: "/owners/login",
    body: payload,
    auth: false,
  });
  const legacyData = normalizeLoginData(legacy.data);
  if (legacyData?.token) {
    persistToken(legacyData.token, rememberMe);
    return { data: legacyData, error: null };
  }

  const combined = (primary.error || legacy.error || "Login failed").trim();
  return {
    data: null,
    error: /403|inactive|expired/i.test(combined)
      ? "Account is inactive or expired"
      : combined || "Invalid email or password",
  };
}

export type SignupVerificationStatus = {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  sent: boolean;
  delivery: string;
};

function normalizeSelfServeRegister(payload: RegisterPayload): RegisterPayload {
  const communal = payload.communalId?.trim().toUpperCase();
  return {
    ...payload,
    email: payload.email.trim(),
    accountType: "EXCLUSIVE",
    registrationType: "USER",
    registrationCode: undefined,
    tierLevel: undefined,
    address: payload.address?.trim() || "N/A",
    ...(communal ? { communalId: communal } : { communalId: undefined }),
  };
}

export async function startSignupVerification(
  payload: RegisterPayload,
): Promise<ApiResult<SignupVerificationStatus>> {
  return request<SignupVerificationStatus>({
    method: "POST",
    path: "/auth/signup/verification",
    body: normalizeSelfServeRegister(payload),
    auth: false,
  });
}

export async function resendSignupVerification(
  email: string,
): Promise<ApiResult<SignupVerificationStatus>> {
  return request<SignupVerificationStatus>({
    method: "POST",
    path: "/auth/signup/verification/resend",
    body: { email: email.trim() },
    auth: false,
  });
}

export async function confirmSignupVerification(
  email: string,
  code: string,
): Promise<ApiResult<{ id?: string }>> {
  return request<{ id?: string }>({
    method: "POST",
    path: "/auth/signup/verification/confirm",
    body: { email: email.trim(), code },
    auth: false,
  });
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<ApiResult<{ id?: string }>> {
  // Self-serve signup is free Individual only. Paid plans activate via Stripe.
  const normalized = normalizeSelfServeRegister(payload);

  const primary = await request<{ id?: string }>({
    method: "POST",
    path: "/register",
    body: normalized,
    auth: false,
  });
  if (!primary.error) return primary;

  return request<{ id?: string }>({
    method: "POST",
    path: "/owners/register",
    body: mapLegacyRegisterPayload(normalized),
    auth: false,
  });
}

export async function fetchProfile(): Promise<ApiResult<AuthUser>> {
  const primary = await request<AuthUser>({ method: "GET", path: "/me" });
  if (primary.data) return primary;
  return request<AuthUser>({ method: "GET", path: "/owners/me" });
}

export async function fetchRegistrationCode(): Promise<ApiResult<string>> {
  const primary = await request<unknown>({
    method: "GET",
    path: "/utils/registration-code",
    auth: false,
  });
  const codePrimary =
    primary.data != null ? parseRegistrationCodePayload(primary.data) : null;
  if (!primary.error && codePrimary) {
    return { data: codePrimary, error: null };
  }

  const legacy = await request<unknown>({
    method: "GET",
    path: "/owners/registration-code",
    auth: false,
  });
  const codeLegacy =
    legacy.data != null ? parseRegistrationCodePayload(legacy.data) : null;
  if (!legacy.error && codeLegacy) {
    return { data: codeLegacy, error: null };
  }

  return {
    data: null,
    error:
      primary.error ||
      legacy.error ||
      "Could not load registration code from the server.",
  };
}

export type JoinableNetwork = {
  network_id: string;
  account_type?: string;
  label?: string;
  administrator_count?: number;
};

export async function listJoinableNetworks(accountType: string) {
  return request<JoinableNetwork[]>({
    method: "GET",
    path: "/owners/networks/public",
    params: { account_type: accountType },
    auth: false,
  });
}

export function logoutLocal(): void {
  clearStoredToken();
}

export function generateNetworkId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `NET-${hex}`;
}

export type PasswordResetStatus = {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  sent: boolean;
  delivery: string;
};

export type PasswordResetConfirm = {
  email: string;
  reset_token: string;
  expires_in_seconds: number;
};

export async function requestPasswordReset(
  email: string,
): Promise<ApiResult<PasswordResetStatus>> {
  return request<PasswordResetStatus>({
    method: "POST",
    path: "/auth/password/forgot",
    body: { email: email.trim() },
    auth: false,
  });
}

export async function resendPasswordReset(
  email: string,
): Promise<ApiResult<PasswordResetStatus>> {
  return request<PasswordResetStatus>({
    method: "POST",
    path: "/auth/password/forgot/resend",
    body: { email: email.trim() },
    auth: false,
  });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
): Promise<ApiResult<PasswordResetConfirm>> {
  return request<PasswordResetConfirm>({
    method: "POST",
    path: "/auth/password/forgot/confirm",
    body: { email: email.trim(), code },
    auth: false,
  });
}

export async function resetPassword(
  email: string,
  resetToken: string,
  password: string,
): Promise<ApiResult<{ updated?: boolean }>> {
  return request<{ updated?: boolean }>({
    method: "POST",
    path: "/auth/password/reset",
    body: { email: email.trim(), reset_token: resetToken, password },
    auth: false,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResult<{ updated?: boolean }>> {
  return request<{ updated?: boolean }>({
    method: "POST",
    path: "/auth/password/change",
    body: { currentPassword, newPassword },
  });
}
