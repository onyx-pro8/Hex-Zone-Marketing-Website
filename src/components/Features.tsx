import type { ReactNode } from "react";
import { Icon } from "./Icon";

type FeatureCard = {
  modifier: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  text: string;
  badge: ReactNode;
};

const cards: FeatureCard[] = [
  {
    modifier: "feature-card--family",
    image: "/assets/feature-family.webp",
    width: 412,
    height: 260,
    alt: "Family of three watching the sunset together",
    title: "Family Safety",
    text: "Keep loved ones close with real-time location and alerts.",
    badge: (
      <svg className="feature-card__icon" viewBox="0 0 24 24" focusable="false">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M12 1.75a8.25 8.25 0 0 0-8.25 8.25c0 5.2 5.6 10.47 7.55 12.12a1.08 1.08 0 0 0 1.4 0C14.65 20.47 20.25 15.2 20.25 10A8.25 8.25 0 0 0 12 1.75Zm0 5.1a3.15 3.15 0 1 1 0 6.3 3.15 3.15 0 0 1 0-6.3Z"
        />
      </svg>
    ),
  },
  {
    modifier: "feature-card--security",
    image: "/assets/feature-security.webp",
    width: 428,
    height: 260,
    alt: "Security officer on patrol outside an office campus",
    title: "Security & Patrols",
    text: "Monitor zones, manage access, and respond to incidents.",
    badge: (
      <svg
        className="feature-card__icon"
        viewBox="0 0 24 24"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m8.75 12 2.25 2.25 4.25-4.5" />
      </svg>
    ),
  },
  {
    modifier: "feature-card--facility",
    image: "/assets/feature-facility.webp",
    width: 428,
    height: 260,
    alt: "Modern office building with a landscaped entrance",
    title: "Facility Access",
    text: "Control entry, manage guests, and track activity on site.",
    badge: (
      <svg className="feature-card__icon" viewBox="0 0 24 24" focusable="false">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M5.5 2h6.5A1.5 1.5 0 0 1 13.5 3.5V22H4V3.5A1.5 1.5 0 0 1 5.5 2Zm1.75 3.5h3v2h-3Zm0 4h3v2h-3Zm0 4h3v2h-3Zm0 4h3v2h-3ZM15 9h4.5A1.5 1.5 0 0 1 21 10.5V22h-6Zm1.75 3.5h2.5v2h-2.5Zm0 4h2.5v2h-2.5Z"
        />
      </svg>
    ),
  },
  {
    modifier: "feature-card--delivery",
    image: "/assets/feature-delivery.webp",
    width: 428,
    height: 260,
    alt: "White delivery van parked on a residential street",
    title: "Delivery & Logistics",
    text: "Optimize routes and ensure safe, authorized deliveries.",
    badge: (
      <svg
        className="feature-card__icon"
        viewBox="0 0 24 24"
        focusable="false"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      >
        <path d="M12 1.9 20.6 6.8 12 11.6 3.4 6.8Z" />
        <path d="M2.6 8.2 11.1 13v9.3l-8.5-4.9Z" />
        <path d="M21.4 8.2 12.9 13v9.3l8.5-4.9Z" />
      </svg>
    ),
  },
  {
    modifier: "feature-card--developer",
    image: "/assets/feature-developer.webp",
    width: 420,
    height: 260,
    alt: "Developer at a desk with live map dashboards on screen",
    title: "Developer Ready",
    text: "Integrate with our REST API and mobile SDK.",
    badge: (
      <svg
        className="feature-card__icon"
        viewBox="0 0 24 24"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m17.5 16.5 4.5-4.5-4.5-4.5" />
        <path d="M6.5 7.5 2 12l4.5 4.5" />
        <path d="m14.25 4.5-4.5 15" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="features" id="features" aria-labelledby="features-title">
      <div className="container">
        <div className="section-head features__head">
          <p className="eyebrow">A COMPLETE ZONE MANAGEMENT SOLUTION</p>
          <h2 className="section-title" id="features-title">
            Powerful Features. Endless Possibilities.
          </h2>
          <p className="section-sub">
            From family safety to large-scale operations, Safe Zone Patrol adapts to your needs.
          </p>
        </div>

        <ul className="features__grid list-reset" role="list">
          {cards.map((card) => (
            <li className="features__item" key={card.title}>
              <article className={`feature-card ${card.modifier}`}>
                <img
                  className="feature-card__media"
                  src={card.image}
                  width={card.width}
                  height={card.height}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                />
                <span className="feature-card__badge" aria-hidden="true">
                  {card.badge}
                </span>
                <h3 className="feature-card__title">{card.title}</h3>
                <p className="feature-card__text">{card.text}</p>
                <a className="link-arrow feature-card__link" href="#">
                  Learn More
                  <span className="visually-hidden"> about {card.title}</span>
                  <Icon id="i-arrow-right" />
                </a>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
