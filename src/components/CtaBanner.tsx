import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export function CtaBanner() {
  return (
    <section className="cta" id="download" aria-labelledby="cta-title">
      <div className="container">
        <div className="cta__banner">
          <svg
            className="cta__lines"
            viewBox="0 0 1350 114"
            preserveAspectRatio="xMaxYMid slice"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="cta-streak-fade"
                gradientUnits="userSpaceOnUse"
                x1="745"
                y1="0"
                x2="830"
                y2="0"
              >
                <stop offset="0" stopColor="#78afff" stopOpacity="0" />
                <stop offset="1" stopColor="#78afff" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#cta-streak-fade)" strokeLinecap="round" strokeLinejoin="round">
              <polyline
                className="cta__streak-glow"
                points="745,112 770,98 824,65 905,25 950,45 978,58 1055,21 1110,-6"
              />
              <polyline
                className="cta__streak"
                points="745,112 770,98 824,65 905,25 950,45 978,58 1055,21 1110,-6"
              />
            </g>
            <g fill="none" stroke="#78afff" strokeLinecap="round">
              <polyline className="cta__streak-glow cta__streak--faint" points="628,80 680,51" />
              <polyline className="cta__streak cta__streak--faint" points="628,80 680,51" />
            </g>
            <g fill="#8fc0ff">
              <circle className="cta__node-glow" cx="824" cy="65" r="6" />
              <circle className="cta__node" cx="824" cy="65" r="2" />
            </g>
          </svg>

          <img
            className="cta__mark"
            src="/assets/logo.png"
            width={64}
            height={64}
            alt=""
            decoding="async"
          />

          <div className="cta__copy">
            <p className="cta__kicker">Trusted by families, teams, and organizations</p>
            <h2 className="cta__title" id="cta-title">
              Join the Safe Zone Patrol community today.
            </h2>
          </div>

          <Link className="btn btn--primary cta__btn" to="/register">
            Get started
            <Icon id="i-arrow-right" />
          </Link>
        </div>
      </div>
    </section>
  );
}
