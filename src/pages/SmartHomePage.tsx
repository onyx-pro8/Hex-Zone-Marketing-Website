import { Link } from "react-router-dom";
import { DocGuideCard } from "../components/DocGuideCard";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";
import { VideoTutorialCard } from "../components/VideoTutorialCard";

const benefits = [
  {
    title: "Hub-aware zones",
    text: "Tie smart-home hubs to the zones they protect so presence and access stay in sync.",
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
    text: "Get notified when hub status, zone activity, or access events need a quick response.",
  },
];

const tutorials = [
  {
    title: "Smart home overview",
    description: "How hubs, zones, and account limits work together in Safe Zone Patrol.",
    duration: "3:55",
    category: "Overview",
  },
  {
    title: "Registering your first hub",
    description: "Add a smart-home hub, confirm plan capacity, and link it to a zone.",
    duration: "5:40",
    category: "Setup",
  },
  {
    title: "Linking hubs to zones",
    description: "Map devices to H3 cells or geofences so monitoring stays accurate.",
    duration: "4:10",
    category: "Zones",
  },
  {
    title: "Switching active login devices",
    description: "Use “use this device instead” safely when moving between phone and web sessions.",
    duration: "2:50",
    category: "Devices",
  },
  {
    title: "Guest access with smart home context",
    description: "Issue temporary access that respects hub and zone permissions.",
    duration: "4:35",
    category: "Access",
  },
  {
    title: "Troubleshooting hub connectivity",
    description: "Common connection issues and how to verify hub status in the dashboard.",
    duration: "6:15",
    category: "Support",
  },
];

const guides = [
  {
    title: "Smart home setup guide",
    description:
      "End-to-end PDF for registering hubs, linking zones, and confirming plan capacity.",
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
    title: "Zone mapping reference",
    description:
      "How to map hubs to H3 cells or geofences, with examples for homes and shared spaces.",
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
        lead="Connect hubs to your zones, manage devices with clear limits, and keep household protection running smoothly — with video and PDF guides ready when content arrives."
      />

      <section className="page-section page-section--tint" aria-labelledby="smart-benefits-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Why smart home</p>
            <h2 className="section-title" id="smart-benefits-title">
              Protection that fits your home network
            </h2>
            <p className="section-sub">
              Built for families and administrators who want zone awareness without a heavy hardware
              stack.
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
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Video tutorials</p>
            <h2 className="section-title" id="smart-videos-title">
              Hub setup and device guides
            </h2>
            <p className="section-sub">
              Placeholder layouts for upcoming smart-home walkthroughs. Drop in video URLs when
              content is ready.
            </p>
          </div>

          <ul className="video-grid list-reset" role="list">
            {tutorials.map((item) => (
              <li key={item.title}>
                <VideoTutorialCard {...item} />
              </li>
            ))}
          </ul>
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
            <Link className="btn btn--outline" to="/#pricing">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
