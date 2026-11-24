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
          <p className="eyebrow">Made for real neighbourhoods</p>
          <h2 className="section-title" id="zone-panel-title">
            A safer neighbourhood, connected
          </h2>
          <p className="section-sub">
            Stay informed, stay secure, and stay close — at home, on your street, and with the people
            who matter.
          </p>
        </div>

        <div className="zone-panel__card">
          <div className="zone-panel__copy">
            <p className="zone-panel__eyebrow">
              <Icon id="i-check-circle" className="icon zone-panel__eyebrow-icon" />
              Built for everyday life
            </p>
            <h3 className="zone-panel__title">Everything your neighbourhood needs in one place</h3>
            <p className="zone-panel__text">
              Whether you look after your family, your street, or a shared community, Safe Zone Patrol
              helps you stay informed, stay secure, and stay connected.
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
