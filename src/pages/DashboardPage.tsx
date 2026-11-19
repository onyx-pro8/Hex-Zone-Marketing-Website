import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ComposeWorkspace } from "../components/dashboard/ComposeWorkspace";
import { MembersWorkspace } from "../components/dashboard/MembersWorkspace";
import { ZonesWorkspace } from "../components/dashboard/ZonesWorkspace";
import { PageHero } from "../components/PageHero";
import { isPrivateAccount } from "../lib/privateAccount";

type DashboardTab = "zones" | "members" | "compose";

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

  if (!isPrivateAccount(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main id="main">
      <PageHero
        eyebrow="Private account"
        title="Dashboard"
        lead="Manage zones, members, and outbound messages. This workspace is available only on Private accounts."
      />
      <section className="page-section page-section--tint" aria-label="Private dashboard">
        <div className="container dash-page">
          <div className="dash-tabs" role="tablist" aria-label="Dashboard">
            {TABS.map((item) => (
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
        </div>
      </section>
    </main>
  );
}
