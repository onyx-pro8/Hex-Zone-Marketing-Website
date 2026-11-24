import { Link } from "react-router-dom";
import { Icon } from "./Icon";

const checklist = [
  "Real-Time Tracking",
  "Secure Guest Access",
  "Instant Alerts",
  "Cross-Platform",
  "Flexible Plans",
];

export function ZonePanel() {
  return (
    <section className="zone-panel" id="solutions" aria-labelledby="zone-panel-title">
      <div className="container">
        <div className="section-head zone-panel__head">
          <p className="eyebrow">Operations that scale</p>
          <h2 className="section-title" id="zone-panel-title">
            Smarter zone management for a connected world
          </h2>
          <p className="section-sub">
            Stay informed, stay secure, and stay connected — whether you manage a home, a community,
            or a critical site.
          </p>
        </div>

        <div className="zone-panel__card">
          <div className="zone-panel__copy">
            <p className="zone-panel__eyebrow">
              <Icon id="i-check-circle" className="icon zone-panel__eyebrow-icon" />
              Built for Real-World Operations
            </p>
            <h3 className="zone-panel__title">Everything you need in one command surface</h3>
            <p className="zone-panel__text">
              Whether you’re managing a community, a workplace, or a critical operation, Safe Zone
              Patrol gives you the tools to stay informed, stay secure, and stay connected.
            </p>
            <Link className="btn btn--primary zone-panel__cta" to="/register">
              Get Started Free
              <Icon id="i-arrow-right" />
            </Link>
          </div>

          <ul className="zone-panel__list" role="list">
            {checklist.map((item) => (
              <li className="zone-panel__item" key={item}>
                <Icon id="i-check-circle" className="icon zone-panel__check" />
                {item}
              </li>
            ))}
          </ul>

          <figure className="zone-panel__media">
            <img
              className="zone-panel__art"
              src="/assets/zone-shield.webp?v=4"
              width={992}
              height={620}
              alt="Isometric hexagonal neighbourhood map protected by a glowing shield"
              loading="lazy"
              decoding="async"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
