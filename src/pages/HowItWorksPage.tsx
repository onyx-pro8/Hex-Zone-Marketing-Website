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
    title: "Create your neighbourhood",
    text: "Set up the places your family and neighbours share, in 3 simple steps.",
  },
  {
    step: "03",
    title: "Connect to your neighbourhood",
    text: "Add your family's devices and home alarm so everyone who should know, does.",
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
              Four steps to a connected neighbourhood
            </h2>
            <p className="section-sub">
              The same simple path for a home, a street, or a whole community.
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
              Each Safe Zone Patrol walkthrough plays here. Open any video on YouTube if you would
              rather watch it there.
            </p>
          </div>

          <ChannelVideoTheater />
        </div>
      </section>

      <section className="page-section page-section--tint page-section--cta" aria-label="Next steps">
        <div className="container page-cta">
          <div className="page-cta__copy">
            <h2 className="page-cta__title">Ready to start your neighbourhood?</h2>
            <p className="page-cta__text">
              Start free, or see how smart home connects your family's devices and home alarm.
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
