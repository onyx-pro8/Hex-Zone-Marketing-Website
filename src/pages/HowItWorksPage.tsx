import { Link } from "react-router-dom";
import { ChannelVideoTheater } from "../components/ChannelVideoTheater";
import { Icon } from "../components/Icon";
import { PageHero } from "../components/PageHero";

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

      <section className="page-section" id="videos" aria-labelledby="how-videos-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Video tutorials</p>
            <h2 className="section-title" id="how-videos-title">
              Learn at your own pace
            </h2>
            <p className="section-sub">
              Walkthroughs from the Safe Zone Patrol channel play here. Open any video on YouTube
              if you would rather watch it there.
            </p>
          </div>

          <ChannelVideoTheater />
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
            <Link className="btn btn--primary" to="/pricing">
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
