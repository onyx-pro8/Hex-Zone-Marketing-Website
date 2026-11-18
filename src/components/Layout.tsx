import { Outlet, useLocation } from "react-router-dom";
import { IconSprite } from "./IconSprite";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const AUTH_SPLIT_PATHS = new Set(["/login", "/register", "/signup"]);
const HIDE_FOOTER_PATHS = new Set([...AUTH_SPLIT_PATHS, "/community"]);

export function Layout() {
  const { pathname } = useLocation();
  const hideFooter = HIDE_FOOTER_PATHS.has(pathname);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <IconSprite />
      <SiteHeader />
      <Outlet />
      {hideFooter ? null : <SiteFooter />}
    </>
  );
}
