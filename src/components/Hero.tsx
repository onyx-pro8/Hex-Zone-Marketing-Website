import { Link } from "react-router-dom";
import { Icon } from "./Icon";

const features = [
  {
    title: "Create Zones",
    text: "with H3 or geofences",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12 1.8a7.6 7.6 0 0 0-7.6 7.6c0 5.3 5.9 11.4 6.9 12.4a1 1 0 0 0 1.4 0c1-1 6.9-7.1 6.9-12.4A7.6 7.6 0 0 0 12 1.8Zm0 4.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 1 0 0-5.6Z"
        />
      </svg>
    ),
  },
  {
    title: "Connect Your Network",
    text: "Members & devices",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="7.4" r="3.5" />
        <circle cx="5" cy="9.3" r="2.4" />
        <circle cx="19" cy="9.3" r="2.4" />
        <path d="M5.9 20.4v-.9c0-3.4 2.7-6.1 6.1-6.1s6.1 2.7 6.1 6.1v.9a.8.8 0 0 1-.8.8H6.7a.8.8 0 0 1-.8-.8ZM4.4 13.3C2.2 13.6.6 15.4.6 17.7v.8c0 .4.3.7.7.7h3.3c.1-2.3 1-4.4 2.5-5.8a5 5 0 0 0-2.7-.1ZM19.6 13.3c2.2.3 3.8 2.1 3.8 4.4v.8c0 .4-.3.7-.7.7h-3.3c-.1-2.3-1-4.4-2.5-5.8a5 5 0 0 1 2.7-.1Z" />
      </svg>
    ),
  },
  {
    title: "Get Real-Time Alerts",
    text: "Track and respond",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.9c-.7 0-1.3.6-1.3 1.3v.7a6.4 6.4 0 0 0-5.1 6.3v3.6l-1.8 2.7a1 1 0 0 0 .8 1.6h14.8a1 1 0 0 0 .8-1.6l-1.8-2.7v-3.6a6.4 6.4 0 0 0-5.1-6.3v-.7c0-.7-.6-1.3-1.3-1.3ZM9.3 19.6a2.8 2.8 0 0 0 5.4 0Z" />
      </svg>
    ),
  },
  {
    title: "Control Access",
    text: "Guests & permissions",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M8 10.6V7.6a4 4 0 0 1 8 0v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <path
          fillRule="evenodd"
          d="M6.6 10h10.8a2.1 2.1 0 0 1 2.1 2.1v7.3a2.1 2.1 0 0 1-2.1 2.1H6.6a2.1 2.1 0 0 1-2.1-2.1v-7.3A2.1 2.1 0 0 1 6.6 10Zm5.4 3.3a1.7 1.7 0 0 0-.85 3.17v2.23h1.7v-2.23A1.7 1.7 0 0 0 12 13.3Z"
        />
      </svg>
    ),
  },
  {
    title: "Communicate",
    text: "On the go",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12 3C6.8 3 2.6 6.6 2.6 11c0 2.2 1 4.2 2.7 5.6l-.9 3.8a.6.6 0 0 0 .8.7l4.4-2.1c.8.2 1.6.3 2.4.3 5.2 0 9.4-3.6 9.4-8.3S17.2 3 12 3ZM7.8 9.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6Zm4.2 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6Zm4.2 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6Z"
        />
      </svg>
    ),
  },
];

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        <img
          className="hero__media-img"
          src="/assets/hero-main.jpg?v=4"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          alt=""
        />
      </div>

      <div className="container hero__inner">
        <div className="hero__copy">
          <h1 className="hero__title" id="hero-title">
            Safe <span className="brand__accent">Zone</span> Patrol
            <span className="hero__tagline">Together. Aware. Protected.</span>
          </h1>
          <p className="hero__lead">
            Where location helps connect communities to the messages that matter - See Something.
            Say Something. Scan to Join
          </p>

          <div className="hero__actions">
            <Link className="btn btn--cyan hero__download" to="/register">
              Get Started
            </Link>
            <a className="hero__store" href="#" aria-label="Download on the App Store">
              <Icon id="i-apple" className="icon hero__store-icon hero__store-icon--apple" />
              <span className="hero__store-label">
                <span className="hero__store-small">Download on the</span>
                <span className="hero__store-name">App Store</span>
              </span>
            </a>
            <a className="hero__store" href="#" aria-label="Get it on Google Play">
              <Icon
                id="i-google-play"
                className="icon hero__store-icon hero__store-icon--play"
                viewBox="0 0 24 26"
              />
              <span className="hero__store-label">
                <span className="hero__store-small hero__store-small--caps">Get it on</span>
                <span className="hero__store-name">Google Play</span>
              </span>
            </a>
          </div>
        </div>

        <ul
          className="hero__features"
          role="list"
          aria-label="What you can do with Safe Zone Patrol"
        >
          {features.map((feature) => (
            <li className="hero__feature" key={feature.title}>
              <span className="hero__feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <p className="hero__feature-title">{feature.title}</p>
              <p className="hero__feature-text">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
