import { Link } from "react-router-dom";
import { DocGuideCard } from "../components/DocGuideCard";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";

const benefits = [
  {
    title: "A home that stays in the picture",
    text: "Tie your smart home to the neighbourhood it protects, so arrivals and access stay in sync.",
  },
  {
    title: "Device registration",
    text: "Register hubs under your plan limits and manage which device is active for login sessions.",
  },
  {
    title: "Guest-ready access",
    text: "Combine guest passes with hub context so visitors get the right entry without sharing keys.",
  },
  {
    title: "Alerts that matter",
    text: "Get notified when your home, your street, or a visitor needs a quick response.",
  },
];

const guides = [
  {
    title: "Smart home setup guide",
    description:
      "A simple guide for connecting your home, your family's devices, and your home alarm.",
    type: "PDF" as const,
    pages: "12 pages",
  },
  {
    title: "Hub & device checklist",
    description:
      "Printable checklist before go-live: hardware, network, account limits, and test alerts.",
    type: "Checklist" as const,
    pages: "2 pages",
  },
  {
    title: "Neighbourhood setup reference",
    description:
      "How to connect your home to the neighbourhood, with simple examples for houses and shared spaces.",
    type: "Guide" as const,
    pages: "8 pages",
  },
  {
    title: "Guest access with hubs",
    description:
      "Policy-friendly guide for temporary access when smart-home context is enabled.",
    type: "PDF" as const,
    pages: "6 pages",
  },
];

export function SmartHomePage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="Product"
        title="Smart home"
        lead="Connect your home, look after your family's devices, and keep everyday protection simple — with videos and guides."
      />

      <section className="page-section page-section--tint" aria-labelledby="smart-benefits-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Why smart home</p>
            <h2 className="section-title" id="smart-benefits-title">
              Protection that fits your home network
            </h2>
            <p className="section-sub">
              Built for families who want neighbourhood awareness without a cupboard full of hardware.
            </p>
          </div>

          <ul className="audiences__grid list-reset" role="list">
            {benefits.map((item) => (
              <li className="audiences__item" key={item.title}>
                <article className="audience-card">
                  <h3 className="audience-card__title">{item.title}</h3>
                  <p className="audience-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-section" aria-labelledby="smart-videos-title">
        <div className="container page-cta">
          <div className="page-cta__copy">
            <p className="eyebrow">Video tutorials</p>
            <h2 className="page-cta__title" id="smart-videos-title">
              Hub setup and device guides
            </h2>
            <p className="page-cta__text">
              Channel videos play on the How it works page. Watch them there, or open the Safe Zone
              Patrol channel on YouTube.
            </p>
          </div>
          <div className="page-cta__actions">
            <Link className="btn btn--primary" to="/how-it-works#videos">
              Watch videos
              <Icon id="i-arrow-right" />
            </Link>
            <a
              className="btn btn--outline"
              href="https://www.youtube.com/@safezonepatrol"
              target="_blank"
              rel="noreferrer"
            >
              Watch on YouTube
            </a>
          </div>
        </div>
      </section>

      <section
        className="page-section page-section--tint"
        id="docs"
        aria-labelledby="smart-docs-title"
      >
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Docs &amp; PDF guides</p>
            <h2 className="section-title" id="smart-docs-title">
              Written guides for install and operations
            </h2>
            <p className="section-sub">
              Downloadable PDFs and checklists will live here. Cards are wired for a file link —
              add the PDF under <code className="doc-inline-code">public/docs</code> when ready.
            </p>
          </div>

          <ul className="doc-grid list-reset" role="list">
            {guides.map((item) => (
              <li key={item.title}>
                <DocGuideCard {...item} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-section page-section--cta" aria-label="Next steps">
        <div className="container page-cta">
          <div className="page-cta__copy">
            <h2 className="page-cta__title">Need the full product walkthrough?</h2>
            <p className="page-cta__text">
              Review the how-it-works flow, or jump to pricing to match hub limits to your plan.
            </p>
          </div>
          <div className="page-cta__actions">
            <Link className="btn btn--primary" to="/how-it-works">
              How it works
              <Icon id="i-arrow-right" />
            </Link>
            <Link className="btn btn--outline" to="/pricing">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
