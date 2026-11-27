import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Map, MessageSquare, PenLine, Users } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { ComposeWorkspace } from "../components/dashboard/ComposeWorkspace";
import { MembersWorkspace } from "../components/dashboard/MembersWorkspace";
import { ZonesWorkspace } from "../components/dashboard/ZonesWorkspace";
import { PageHero } from "../components/PageHero";

type DashboardTab = "zones" | "members" | "compose";

const TABS: { id: DashboardTab; label: string; hint: string; icon: ReactNode }[] = [
  {
    id: "zones",
    label: "Zones",
    hint: "Draw and manage your zones",
    icon: <Map size={18} />,
  },
  {
    id: "members",
    label: "Members",
    hint: "People on your network",
    icon: <Users size={18} />,
  },
  {
    id: "compose",
    label: "Message",
    hint: "Inbox and alerts",
    icon: <MessageSquare size={18} />,
  },
];

export function DashboardPage() {
  const { token, loading } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("zones");
  const [composeOpen, setComposeOpen] = useState(false);

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

  return (
    <main id="main">
      <PageHero
        eyebrow="Your account"
        title="Dashboard"
        lead="Manage your zones, network members, and messages."
      />
      <section className="page-section page-section--tint" aria-label="Dashboard">
        <div className="container settings-split">
          <nav className="settings-split__nav" aria-label="Dashboard">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                className={`settings-split__link${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <span className="settings-split__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>
                  <span className="settings-split__name">{item.label}</span>
                  <span className="settings-split__hint">{item.hint}</span>
                </span>
              </button>
            ))}
            <button
              className="btn btn--primary dash-compose-launch"
              type="button"
              onClick={() => {
                setTab("compose");
                setComposeOpen(true);
              }}
            >
              <PenLine size={16} aria-hidden="true" />
              Compose
            </button>
          </nav>
          <div className="settings-split__content">
            {tab === "zones" ? <ZonesWorkspace /> : null}
            {tab === "members" ? <MembersWorkspace /> : null}
            {tab === "compose" ? (
              <ComposeWorkspace
                composeOpen={composeOpen}
                onComposeOpenChange={setComposeOpen}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
