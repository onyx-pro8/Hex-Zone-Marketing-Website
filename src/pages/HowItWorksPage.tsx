import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";
import { VideoTutorialCard } from "../components/VideoTutorialCard";

const steps = [
  {
    step: "01",
    title: "Create your account",
    text: "Sign up, choose a plan, and set your administrator profile in a few minutes.",
  },
  {
    step: "02",
    title: "Define zones",
    text: "Draw geofences or assign H3 cells for homes, campuses, routes, and patrol areas.",
  },
  {
    step: "03",
    title: "Connect your network",
    text: "Invite members, register devices, and configure roles for the right level of access.",
  },
  {
    step: "04",
    title: "Monitor and respond",
    text: "Receive real-time alerts, manage guest access, and coordinate from web or mobile.",
  },
];

const tutorials = [
  {
    title: "Getting started with Safe Zone Patrol",
    description: "A quick walkthrough of the dashboard, zones, and your first alert setup.",
    duration: "4:20",
    category: "Basics",
  },
  {
    title: "Creating zones with H3 and geofences",
    description: "Learn how to draw, edit, and organize zones for homes, sites, and routes.",
    duration: "6:05",
    category: "Zones",
  },
  {
    title: "Inviting members and assigning roles",
    description: "Add people to your network and control what each role can see and do.",
    duration: "3:48",
    category: "Network",
  },
  {
    title: "Guest passes and access control",
    description: "Issue temporary access, set permissions, and review guest activity.",
    duration: "5:12",
    category: "Access",
  },
  {
    title: "Alerts and incident response",
    description: "Configure alert rules and respond quickly when something needs attention.",
    duration: "4:55",
    category: "Alerts",
  },
  {
    title: "Using the mobile app on the go",
    description: "Stay connected with live status, notifications, and mobile guest tools.",
    duration: "3:30",
    category: "Mobile",
  },
];

export function HowItWorksPage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="Product"
        title="How it works"
        lead="See how Safe Zone Patrol takes you from setup to live protection — with step-by-step guidance and video tutorials."
      />

      <section className="page-section page-section--tint" aria-labelledby="how-steps-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Workflow</p>
            <h2 className="section-title" id="how-steps-title">
              Four steps to a connected zone network
            </h2>
            <p className="section-sub">
              The same flow whether you protect a household, a community, or a multi-site operation.
            </p>
          </div>

          <ol className="how__grid list-reset" role="list">
            {steps.map((item) => (
              <li className="how__item" key={item.step}>
                <article className="how-card">
                  <span className="how-card__step" aria-hidden="true">
                    {item.step}
                  </span>
                  <h3 className="how-card__title">{item.title}</h3>
                  <p className="how-card__text">{item.text}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-section" aria-labelledby="how-videos-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Video tutorials</p>
            <h2 className="section-title" id="how-videos-title">
              Learn at your own pace
            </h2>
            <p className="section-sub">
              Short walkthroughs for setup, zones, access, and day-to-day operations. Videos will
              appear here when published.
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

      <section className="page-section page-section--tint page-section--cta" aria-label="Next steps">
        <div className="container page-cta">
          <div className="page-cta__copy">
            <h2 className="page-cta__title">Ready to set up your first zone?</h2>
            <p className="page-cta__text">
              Start free, or explore smart-home hub setup if you are connecting devices at home.
            </p>
          </div>
          <div className="page-cta__actions">
            <Link className="btn btn--primary" to="/#pricing">
              View pricing
              <Icon id="i-arrow-right" />
            </Link>
            <Link className="btn btn--outline" to="/smart-home">
              Smart home guide
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
