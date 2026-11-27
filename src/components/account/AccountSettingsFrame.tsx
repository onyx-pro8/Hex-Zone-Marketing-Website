import type { ReactNode } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { PageHero } from "../PageHero";

export type SettingsCategory = {
  to: string;
  label: string;
  hint: string;
  icon: ReactNode;
};

export type SettingsNavItem =
  | { type: "link"; category: SettingsCategory }
  | { type: "group"; label: string; categories: SettingsCategory[] };

type SettingsShellProps = {
  eyebrow: string;
  title: string;
  lead: string;
  items: SettingsNavItem[];
  footer?: ReactNode;
  children: ReactNode;
};

export function SettingsShell({
  eyebrow,
  title,
  lead,
  items,
  footer,
  children,
}: SettingsShellProps) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (!loading && !token) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return (
    <main id="main">
      <PageHero eyebrow={eyebrow} title={title} lead={lead} />
      <section className="page-section page-section--tint" aria-label={title}>
        <div className="container settings-split">
          <nav className="settings-split__nav" aria-label={title}>
            {items.map((item) =>
              item.type === "group" ? (
                <div className="settings-split__group" key={item.label}>
                  <p className="settings-split__label">{item.label}</p>
                  <CategoryList categories={item.categories} />
                </div>
              ) : (
                <CategoryList key={item.category.to} categories={[item.category]} />
              ),
            )}
            {footer}
          </nav>
          <div className="settings-split__content">
            {loading ? <p className="settings-status">Loading your settings…</p> : children}
          </div>
        </div>
      </section>
    </main>
  );
}

function CategoryList({ categories }: { categories: SettingsCategory[] }) {
  return (
    <>
      {categories.map((category) => (
        <NavLink
          key={category.to}
          className={({ isActive }) =>
            `settings-split__link${isActive ? " is-active" : ""}`
          }
          to={category.to}
        >
          <span className="settings-split__icon" aria-hidden="true">
            {category.icon}
          </span>
          <span>
            <span className="settings-split__name">{category.label}</span>
            <span className="settings-split__hint">{category.hint}</span>
          </span>
        </NavLink>
      ))}
    </>
  );
}

type AccountSettingsFrameProps = {
  title: string;
  lead?: string;
  backTo?: string;
  wide?: boolean;
  children: ReactNode;
};

export function AccountSettingsFrame({ title, lead, children }: AccountSettingsFrameProps) {
  return (
    <article className="settings-panel">
      <header className="settings-panel__head">
        <h2>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </header>
      {children}
    </article>
  );
}
