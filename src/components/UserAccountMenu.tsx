import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { initialsFor, useAuthenticatedAvatarSrc } from "../lib/avatar";

type UserAccountMenuProps = {
  onNavigate?: () => void;
};

export function UserAccountMenu({ onNavigate }: UserAccountMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const avatarSrc = useAuthenticatedAvatarSrc(
    user?.avatar_url ?? user?.avatarUrl,
  );
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
        <span
          className={`site-header__avatar${avatarSrc ? " has-photo" : ""}`}
          aria-hidden="true"
        >
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
