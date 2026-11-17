import { Brand } from "./Brand";
import { Icon } from "./Icon";

const footerCols = [
  {
    heading: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/how-it-works.html", label: "How it works" },
      { href: "/smart-home.html", label: "Smart home" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { href: "/communities.html", label: "Communities" },
      { href: "/security-privacy.html", label: "Security & Privacy" },
    ],
  },
  {
    heading: "Pricing",
    links: [{ href: "/pricing.html", label: "Pricing" }],
  },
  {
    heading: "Company",
    links: [
      { href: "/about.html", label: "About" },
      { href: "/faq.html", label: "FAQ" },
      { href: "/contact.html", label: "Contact" },
    ],
  },
];

const social = [
  { href: "#", label: "Safe Zone Patrol on YouTube", icon: "i-youtube", className: "youtube" },
  { href: "#", label: "Safe Zone Patrol on LinkedIn", icon: "i-linkedin", className: "linkedin" },
  { href: "#", label: "Safe Zone Patrol on X", icon: "i-x", className: "x" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Brand className="brand site-footer__brand" markWidth={54} markHeight={54} />

        <nav className="site-footer__nav" aria-label="Footer">
          <div className="site-footer__cols">
            {footerCols.map((col) => (
              <div className="site-footer__col" key={col.heading}>
                <p className="site-footer__heading">{col.heading}</p>
                <ul className="site-footer__links" role="list">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="site-footer__meta">
          <ul className="site-footer__social" role="list">
            {social.map((item) => (
              <li key={item.className}>
                <a
                  className={`site-footer__social-link site-footer__social-link--${item.className}`}
                  href={item.href}
                  aria-label={item.label}
                >
                  <Icon id={item.icon} />
                </a>
              </li>
            ))}
          </ul>
          <p className="site-footer__copy">
            &copy; 2026 Safe Zone Patrol. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
