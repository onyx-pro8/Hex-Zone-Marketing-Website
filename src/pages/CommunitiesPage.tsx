import { PageCta } from "../components/PageCta";
import { PageHero } from "../components/PageHero";

const capabilities = [
  {
    title: "Shared neighborhood zones",
    text: "Define communal areas, gates, and shared spaces so residents and guests stay aligned.",
  },
  {
    title: "Member coordination",
    text: "Invite households, assign roles, and keep communication tied to the zones that matter.",
  },
  {
    title: "Guest-friendly access",
    text: "Issue temporary passes for visitors, deliveries, and service providers without sharing permanent credentials.",
  },
  {
    title: "Incident awareness",
    text: "Surface alerts and activity so community admins can respond quickly and keep a clear record.",
  },
];

const useCases = [
  {
    title: "Residential communities",
    text: "HOAs and gated neighborhoods that need shared awareness without heavy hardware installs.",
  },
  {
    title: "Campus living",
    text: "Student housing and multi-building residences coordinating access across connected zones.",
  },
  {
    title: "Mixed-use sites",
    text: "Communities that blend homes, amenities, and visitor traffic under one zone network.",
  },
];

export function CommunitiesPage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="Solutions"
        title="Communities"
        lead="Keep neighborhoods connected with shared zones, member coordination, and guest access that scales from a single street to a full community network."
      />

      <section className="page-section page-section--tint" aria-labelledby="communities-cap-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Built for shared spaces</p>
            <h2 className="section-title" id="communities-cap-title">
              Everything a community admin needs
            </h2>
            <p className="section-sub">
              Run day-to-day neighborhood operations with clear zones, roles, and real-time visibility.
            </p>
          </div>
          <ul className="audiences__grid list-reset" role="list">
            {capabilities.map((item) => (
              <li key={item.title}>
                <article className="audience-card">
                  <h3 className="audience-card__title">{item.title}</h3>
                  <p className="audience-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-section" aria-labelledby="communities-use-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Where it fits</p>
            <h2 className="section-title" id="communities-use-title">
              Designed for real community operations
            </h2>
            <p className="section-sub">
              From HOAs to campus living, Safe Zone Patrol adapts to how your community already works.
            </p>
          </div>
          <ul className="platforms__grid list-reset" role="list">
            {useCases.map((item) => (
              <li key={item.title}>
                <article className="platform-card">
                  <h3 className="platform-card__title">{item.title}</h3>
                  <p className="platform-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageCta
        title="Ready to connect your community?"
        text="Compare plans for multi-member networks, or see how zone setup works end to end."
        actions={[
          { to: "/pricing", label: "View pricing", primary: true },
          { to: "/how-it-works", label: "How it works" },
        ]}
      />
    </main>
  );
}
