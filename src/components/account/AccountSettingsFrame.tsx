import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

type AccountSettingsFrameProps = {
  title: string;
  lead: string;
  backTo?: string;
  wide?: boolean;
  children: ReactNode;
};

export function AccountSettingsFrame({
  title,
  lead,
  backTo,
  wide = false,
  children,
}: AccountSettingsFrameProps) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (!loading && !token) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return (
    <main className="auth-page settings-page" id="main">
      <div
        className={`container settings-page__inner${wide ? " settings-page__inner--wide" : " settings-page__inner--narrow"}`}
      >
        {backTo ? (
          <Link className="settings-back" to={backTo}>
            Back
          </Link>
        ) : null}
        <header className="settings-page__header">
          <p className="eyebrow">Your account</p>
          <h1 className="settings-page__title">{title}</h1>
          <p className="settings-page__lead">{lead}</p>
        </header>
        {loading ? <p className="settings-status">Loading your settings…</p> : children}
      </div>
    </main>
  );
}

export function SettingsCategoryLink({
  to,
  title,
  subtitle,
  icon,
}: {
  to: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link className="settings-nav" to={to}>
      <span className="settings-nav__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-nav__copy">
        <span className="settings-nav__title">{title}</span>
        <span className="settings-nav__subtitle">{subtitle}</span>
      </span>
      <ChevronRight className="settings-nav__chevron" aria-hidden="true" />
    </Link>
  );
}
