import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

type NavKey = "product" | "solutions" | "company" | null;

const productLinks = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/smart-home", label: "Smart home" },
];

const solutionsLinks = [
  { to: "/security-privacy", label: "Security & Privacy" },
];

const companyLinks = [
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, token, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<NavKey>(null);
  const headerRef = useRef<HTMLElement>(null);
  const signedIn = Boolean(token && user);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (headerRef.current?.contains(target)) return;
      setOpenMenu(null);
    }
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  function toggleMenu(key: NavKey) {
    setOpenMenu((current) => (current === key ? null : key));
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container site-header__inner">
        <Brand className="brand site-header__brand" />

        <button
          className="site-header__toggle"
          type="button"
          popoverTarget="site-menu"
          aria-label="Open menu"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <nav className="site-header__nav" id="site-menu" popover="" aria-label="Primary">
          <ul className="site-header__links" role="list">
            <li>
              <NavLink
                className={({ isActive }) =>
                  `site-header__link${isActive ? " is-active" : ""}`
                }
                to="/"
                end
                onClick={closeMenu}
              >
                Home
              </NavLink>
            </li>

            <li className={`nav-item${openMenu === "product" ? " is-open" : ""}`}>
              <button
                className="site-header__link nav-item__trigger"
                type="button"
                aria-expanded={openMenu === "product"}
                aria-controls="nav-product"
                aria-haspopup="true"
                onClick={() => toggleMenu("product")}
              >
                Product
                <Icon id="i-chevron-down" className="icon site-header__chevron" />
              </button>
              <ul className="nav-dropdown" id="nav-product" role="list">
                {productLinks.map((link) => (
                  <li key={link.to}>
                    <Link className="nav-dropdown__link" to={link.to} onClick={closeMenu}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li className={`nav-item${openMenu === "solutions" ? " is-open" : ""}`}>
              <button
                className="site-header__link nav-item__trigger"
                type="button"
                aria-expanded={openMenu === "solutions"}
                aria-controls="nav-solutions"
                aria-haspopup="true"
                onClick={() => toggleMenu("solutions")}
              >
                Solutions
                <Icon id="i-chevron-down" className="icon site-header__chevron" />
              </button>
              <ul className="nav-dropdown" id="nav-solutions" role="list">
                {solutionsLinks.map((link) => (
                  <li key={link.to + link.label}>
                    <Link className="nav-dropdown__link" to={link.to} onClick={closeMenu}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li>
              <NavLink
                className={({ isActive }) =>
                  `site-header__link${isActive ? " is-active" : ""}`
                }
                to="/pricing"
                onClick={closeMenu}
              >
                Pricing
              </NavLink>
            </li>

            <li className={`nav-item${openMenu === "company" ? " is-open" : ""}`}>
              <button
                className="site-header__link nav-item__trigger"
                type="button"
                aria-expanded={openMenu === "company"}
                aria-controls="nav-company"
                aria-haspopup="true"
                onClick={() => toggleMenu("company")}
              >
                Company
                <Icon id="i-chevron-down" className="icon site-header__chevron" />
              </button>
              <ul className="nav-dropdown" id="nav-company" role="list">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link className="nav-dropdown__link" to={link.to} onClick={closeMenu}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
          {signedIn ? (
            <div className="site-header__account">
              <Link
                className="btn btn--ghost site-header__signin"
                to="/account"
                onClick={closeMenu}
              >
                {user?.name?.split(" ")[0] || "Account"}
              </Link>
              <button
                className="site-header__signout"
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              className="btn btn--ghost site-header__signin"
              to="/login"
              onClick={closeMenu}
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
