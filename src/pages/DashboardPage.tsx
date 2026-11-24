import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ComposeWorkspace } from "../components/dashboard/ComposeWorkspace";
import { MembersWorkspace } from "../components/dashboard/MembersWorkspace";
import { PermissionWorkspace } from "../components/dashboard/PermissionWorkspace";
import { ZonesWorkspace } from "../components/dashboard/ZonesWorkspace";
import { PageHero } from "../components/PageHero";
import { accountTypeLabel, isSystemAdministrator } from "../lib/privateAccount";

type DashboardTab = "zones" | "members" | "compose" | "permission";

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "zones", label: "Zones" },
  { id: "members", label: "Members" },
  { id: "compose", label: "Compose" },
];

export function DashboardPage() {
  const { user, token, loading } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("zones");

  if (loading) {
    return (
      <main id="main">
        <section className="page-section page-section--tint">
          <div className="container">
            <p className="community-page__status">Loading dashboard…</p>
          </div>
        </section>
      </main>
    );
  }

  if (!token) {
    return <Navigate to="/login?next=/dashboard" replace />;
  }

  const canGrantPermission = isSystemAdministrator(user);
  const tabs = canGrantPermission
    ? [...TABS, { id: "permission" as const, label: "Permission" }]
    : TABS;
  const accountLabel = accountTypeLabel(user?.accountType ?? user?.account_type);

  return (
    <main id="main">
      <PageHero
        eyebrow={accountLabel}
        title="Dashboard"
        lead={
          canGrantPermission
            ? "Manage your zones, network members, and messages, and give Technical Support permission."
            : "Manage your zones, network members, and messages."
        }
      />
      <section className="page-section page-section--tint" aria-label="Dashboard">
        <div className="container dash-page">
          <div className="dash-tabs" role="tablist" aria-label="Dashboard">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`dash-tab${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab === "zones" ? <ZonesWorkspace /> : null}
          {tab === "members" ? <MembersWorkspace /> : null}
          {tab === "compose" ? <ComposeWorkspace /> : null}
          {tab === "permission" && canGrantPermission ? <PermissionWorkspace /> : null}
        </div>
      </section>
    </main>
  );
}
