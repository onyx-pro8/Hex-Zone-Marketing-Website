import { Outlet } from "react-router-dom";
import { IconSprite } from "./IconSprite";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <IconSprite />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  );
}
