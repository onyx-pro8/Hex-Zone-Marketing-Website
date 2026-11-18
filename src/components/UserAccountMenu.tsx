import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { API_BASE_URL, getStoredToken } from "../lib/api";

function initialsFor(name?: string | null, email?: string | null): string {
  const fromName = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;
  const fromEmail = String(email ?? "").trim()[0];
  return fromEmail ? fromEmail.toUpperCase() : "U";
}

function absolutizeAvatarUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function useAuthenticatedAvatarSrc(avatarUrl?: string | null) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const raw = avatarUrl?.trim() || "";
    if (!raw) {
      setSrc(null);
      return;
    }
    if (raw.startsWith("data:")) {
      setSrc(raw);
      return;
    }

    const absolute = absolutizeAvatarUrl(raw);
    const token = getStoredToken();
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(absolute, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          if (!cancelled) setSrc(null);
          return;
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  return src;
}

type UserAccountMenuProps = {
  onNavigate?: () => void;
};

export function UserAccountMenu({ onNavigate }: UserAccountMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const avatarSrc = useAuthenticatedAvatarSrc(user?.avatar_url ?? user?.avatarUrl);
  const initials = initialsFor(user?.name, user?.email);
  const label = user?.name?.split(" ")[0] || "Account";

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className={`site-header__account${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <button
        className="site-header__user"
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="site-header__avatar" aria-hidden="true">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" width={32} height={32} />
          ) : (
            <span className="site-header__avatar-fallback">{initials}</span>
          )}
        </span>
        <span className="site-header__user-name">{label}</span>
      </button>

      <div
        className="site-header__user-menu"
        id={menuId}
        role="menu"
        hidden={!open}
      >
        <Link
          className="site-header__user-item"
          role="menuitem"
          to="/account"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          User settings
        </Link>
        <button
          className="site-header__user-item site-header__user-item--danger"
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
            logout();
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
