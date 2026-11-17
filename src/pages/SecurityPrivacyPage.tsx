import { Icon } from "../components/Icon";
import { PageCta } from "../components/PageCta";
import { PageHero } from "../components/PageHero";

const controls = [
  {
    index: "01",
    title: "Identity & roles",
    text: "Separate administrator, member, and guest permissions so every action maps to a clear responsibility.",
  },
  {
    index: "02",
    title: "Access boundaries",
    text: "Grant temporary guest passes and scoped privileges instead of sharing permanent credentials across a network.",
  },
  {
    index: "03",
    title: "Operational visibility",
    text: "Retain access events, alerts, and response history so teams can review what happened and when.",
  },
  {
    index: "04",
    title: "Session & device control",
    text: "Manage active sessions across web and mobile so account holders can revoke access when devices change hands.",
  },
];

const commitments = [
  {
    title: "Encryption in transit",
    text: "Client and server traffic is protected so location, account, and configuration data stay confidential on the wire.",
  },
  {
    title: "Least-privilege defaults",
    text: "New members and guests start with limited reach. Broader permissions are explicit, not assumed.",
  },
  {
    title: "Policy-aligned retention",
    text: "Operational history windows can follow the retention needs of households, facilities, and organizations.",
  },
  {
    title: "Plan-level safeguards",
    text: "API, messaging, and access tooling scale with subscription limits so usage stays predictable and governed.",
  },
];

const sharedResponsibilities = [
  {
    side: "Safe Zone Patrol",
    items: [
      "Platform authentication, authorization, and session controls",
      "Secure transport for application traffic",
      "Role models for administrators, members, and guests",
      "Audit-ready event trails for access and alert activity",
    ],
  },
  {
    side: "Account holders",
    items: [
      "Assign roles that match real operational needs",
      "Review guest passes and revoke access when visits end",
      "Protect administrator credentials and device ownership",
      "Configure retention and visibility to match local policy",
    ],
  },
];

export function SecurityPrivacyPage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="Solutions"
        title="Security & Privacy"
        lead="Controls designed for real operations — so households, teams, and organizations can manage zones with confidence and clear accountability."
      />

      <section className="page-section page-section--tint" aria-labelledby="security-overview-title">
        <div className="container content-split">
          <div className="content-split__intro">
            <p className="eyebrow">Overview</p>
            <h2 className="section-title" id="security-overview-title">
              Protection is part of the product model
            </h2>
          </div>
          <div className="content-split__body">
            <p>
              Safe Zone Patrol treats security and privacy as operating requirements, not optional
              extras. Access, visibility, and retention are built into how zones, members, devices,
              and guests interact.
            </p>
            <p>
              The goal is straightforward: give administrators precise control, give members the
              information they need, and keep guest access temporary, scoped, and reviewable.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section" aria-labelledby="security-controls-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Control framework</p>
            <h2 className="section-title" id="security-controls-title">
              Four layers of operational control
            </h2>
            <p className="section-sub">
              From identity to incident history, each layer supports safer day-to-day zone management.
            </p>
          </div>
          <ul className="pro-card-grid list-reset" role="list">
            {controls.map((item) => (
              <li key={item.title}>
                <article className="pro-card">
                  <span className="pro-card__index" aria-hidden="true">
                    {item.index}
                  </span>
                  <h3 className="pro-card__title">{item.title}</h3>
                  <p className="pro-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-section page-section--tint" aria-labelledby="security-commitments-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Platform commitments</p>
            <h2 className="section-title" id="security-commitments-title">
              What we protect by default
            </h2>
            <p className="section-sub">
              Practical safeguards that stay useful whether you manage a household or a multi-site network.
            </p>
          </div>
          <ul className="commit-grid list-reset" role="list">
            {commitments.map((item) => (
              <li key={item.title}>
                <article className="commit-card">
                  <div className="commit-card__mark" aria-hidden="true">
                    <Icon id="i-check-circle" className="icon" />
                  </div>
                  <div>
                    <h3 className="commit-card__title">{item.title}</h3>
                    <p className="commit-card__text">{item.text}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-section" aria-labelledby="security-shared-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Shared responsibility</p>
            <h2 className="section-title" id="security-shared-title">
              Stronger when both sides do their part
            </h2>
            <p className="section-sub">
              The platform provides the controls. Account holders decide how those controls are applied.
            </p>
          </div>
          <div className="responsibility-grid">
            {sharedResponsibilities.map((column) => (
              <article className="responsibility-card" key={column.side}>
                <h3 className="responsibility-card__title">{column.side}</h3>
                <ul className="responsibility-card__list list-reset" role="list">
                  {column.items.map((item) => (
                    <li key={item}>
                      <Icon id="i-check-circle" className="icon responsibility-card__icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PageCta
        title="Need a deeper security conversation?"
        text="Ask about enterprise requirements, access policy, or how plan limits map to your deployment."
        actions={[
          { to: "/contact", label: "Contact sales", primary: true },
          { to: "/faq", label: "Read FAQ" },
        ]}
      />
    </main>
  );
}
