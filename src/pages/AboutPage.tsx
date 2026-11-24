import { PageCta } from "../components/PageCta";
import { PageHero } from "../components/PageHero";

const pillars = [
  {
    title: "Weave places, people, and devices",
    text: "A neighbourhood works when the people, homes, and devices that belong there stay connected.",
  },
  {
    title: "Monitor with intent",
    text: "Alerts and live status should reduce noise — highlighting what needs attention, not flooding every channel.",
  },
  {
    title: "Protect without friction",
    text: "Access rules, guest passes, and role boundaries should be clear enough to use under pressure.",
  },
];

const focusAreas = [
  {
    label: "What we build",
    title: "Neighbourhoods that look out for each other",
    text: "Safe Zone Patrol helps you create a neighbourhood, connect your family, welcome guests, and get alerts on the web and on your phone.",
  },
  {
    label: "Who we serve",
    title: "Homes, teams, and organizations",
    text: "The same platform supports household networks, facility operations, and larger organization deployments with tiered capacity and admin tooling.",
  },
  {
    label: "How we work",
    title: "Clarity first, then scale",
    text: "We prioritize understandable workflows, explicit permissions, and predictable plan limits so growth does not come at the cost of control.",
  },
];

export function AboutPage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="Company"
        title="About Safe Zone Patrol"
        lead="We help families and neighbours look out for each other — connecting the people and places that matter, on the web and on your phone."
      />

      <section className="page-section page-section--tint" aria-labelledby="about-mission-title">
        <div className="container content-split">
          <div className="content-split__intro">
            <p className="eyebrow">Mission</p>
            <h2 className="section-title" id="about-mission-title">
              Feel safer. Stay connected. Look out for one another.
            </h2>
          </div>
          <div className="content-split__body">
            <p>
              Location alone is not enough. Families and neighbours need a shared way to know who
              belongs, what is happening nearby, and how to reach the people who matter.
            </p>
            <p>
              Safe Zone Patrol brings your neighbourhood, your family's devices, guest visits, and
              alerts into one place — simple from the first setup, and ready as your community grows.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section" aria-labelledby="about-pillars-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Brand pillars</p>
            <h2 className="section-title" id="about-pillars-title">
              The standard behind every release
            </h2>
            <p className="section-sub">
              Three commitments guide product decisions from interface design to plan architecture.
            </p>
          </div>
          <ol className="pillar-list list-reset" role="list">
            {pillars.map((item, index) => (
              <li className="pillar-item" key={item.title}>
                <span className="pillar-item__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="pillar-item__title">{item.title}</h3>
                  <p className="pillar-item__text">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-section page-section--tint" aria-labelledby="about-focus-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Company focus</p>
            <h2 className="section-title" id="about-focus-title">
              Built for operators who need clarity
            </h2>
            <p className="section-sub">
              Whether you manage a household network or an organization with multiple sites, the
              operating model stays consistent.
            </p>
          </div>
          <ul className="focus-grid list-reset" role="list">
            {focusAreas.map((item) => (
              <li key={item.label}>
                <article className="focus-card">
                  <p className="focus-card__label">{item.label}</p>
                  <h3 className="focus-card__title">{item.title}</h3>
                  <p className="focus-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageCta
        title="Explore the platform"
        text="See how setup works, compare plans, or contact us about partnership and enterprise needs."
        actions={[
          { to: "/how-it-works", label: "How it works", primary: true },
          { to: "/contact", label: "Contact us" },
        ]}
      />
    </main>
  );
}
