import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchProfile,
  getRememberMe,
  getStoredToken,
  loginRequest,
  logoutLocal,
  registerRequest,
  type AccountType,
  type AuthUser,
  type RegisterPayload,
  type RegistrationType,
} from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    options?: { rememberMe?: boolean },
  ) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserAvatar: (avatarUrl: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseAccountType(value?: string | null): AccountType | undefined {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "PRIVATE_PLUS" || normalized === "PRIVATE+") {
    return "PRIVATE_PLUS";
  }
  if (normalized === "EXCLUSIVE") return "EXCLUSIVE";
  if (normalized === "ENHANCED") return "ENHANCED";
  if (
    normalized === "ENHANCED_PLUS" ||
    normalized === "ENHANCED+" ||
    normalized === "ENHANCE_PLUS"
  ) {
    return "ENHANCED_PLUS";
  }
  if (normalized === "PRIVATE") return "PRIVATE";
  return undefined;
}

function parseRegistrationType(value?: string | null): RegistrationType | undefined {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "USER") return "USER";
  if (normalized === "ADMINISTRATOR") return "ADMINISTRATOR";
  return undefined;
}

function displayName(user: AuthUser): string {
  const composed = [user.first_name, user.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .trim();
  if (composed) return composed;
  if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
  if (typeof user.email === "string" && user.email.trim()) return user.email.trim();
  return "Account";
}

export function normalizeUser(raw: AuthUser): AuthUser {
  const accountType =
    parseAccountType(raw.accountType) ??
    parseAccountType(raw.account_type) ??
    "PRIVATE";
  const registrationType =
    parseRegistrationType(raw.registrationType) ??
    parseRegistrationType(raw.registration_type) ??
    (String(raw.role ?? "").toLowerCase() === "user" ? "USER" : "ADMINISTRATOR");

  const avatar =
    (typeof raw.avatar_url === "string" && raw.avatar_url.trim()) ||
    (typeof raw.avatarUrl === "string" && raw.avatarUrl.trim()) ||
    null;

  return {
    ...raw,
    name: displayName(raw),
    accountType,
    account_type: accountType,
    registrationType,
    registration_type: registrationType,
    zoneId:
      (typeof raw.zoneId === "string" && raw.zoneId) ||
      (raw.zone_id != null ? String(raw.zone_id) : undefined),
    zone_id: raw.zone_id ?? raw.zoneId,
    avatar_url: avatar,
    avatarUrl: avatar,
    communalId:
      (typeof raw.communalId === "string" && raw.communalId.trim()) ||
      (typeof raw.communal_id === "string" && raw.communal_id.trim()) ||
      null,
    communal_id:
      (typeof raw.communal_id === "string" && raw.communal_id.trim()) ||
      (typeof raw.communalId === "string" && raw.communalId.trim()) ||
      null,
    tierLevel:
      typeof raw.tierLevel === "number"
        ? raw.tierLevel
        : typeof raw.tier_level === "number"
          ? raw.tier_level
          : null,
    tier_level:
      typeof raw.tier_level === "number"
        ? raw.tier_level
        : typeof raw.tierLevel === "number"
          ? raw.tierLevel
          : null,
  };
}

function parseJwtExp(token: string): number | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(atob(payloadPart)) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const exp = parseJwtExp(token);
  if (!exp) return false;
  return Date.now() >= exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  const logout = useCallback(() => {
    logoutLocal();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = getStoredToken();
    if (!current || isExpired(current)) {
      logout();
      return;
    }
    setLoading(true);
    const result = await fetchProfile();
    if (result.data) setUser(normalizeUser(result.data));
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (isExpired(token)) {
      logout();
      return;
    }

    let mounted = true;
    setLoading(true);
    void fetchProfile().then((result) => {
      if (!mounted) return;
      if (result.data) setUser(normalizeUser(result.data));
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;
    const exp = parseJwtExp(token);
    if (!exp) return;
    const timeoutMs = exp * 1000 - Date.now();
    if (timeoutMs <= 0) {
      logout();
      return;
    }
    const timeout = window.setTimeout(() => logout(), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [token, logout]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      options?: { rememberMe?: boolean },
    ) => {
      const rememberMe = options?.rememberMe ?? getRememberMe();
      const result = await loginRequest({ email, password }, rememberMe);
      if (!result.data?.token) {
        throw new Error(result.error ?? "Login failed");
      }
      setToken(result.data.token);
      if (result.data.user?.id) {
        setUser(normalizeUser(result.data.user));
      } else {
        const me = await fetchProfile();
        if (!me.data) throw new Error(me.error ?? "Could not load profile");
        setUser(normalizeUser(me.data));
      }
    },
    [],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await registerRequest(payload);
    if (result.error) throw new Error(result.error);
  }, []);

  const setUserAvatar = useCallback((avatarUrl: string | null) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            avatar_url: avatarUrl,
            avatarUrl: avatarUrl,
          }
        : prev,
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setUserAvatar,
    }),
    [user, token, loading, login, register, logout, refreshUser, setUserAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
