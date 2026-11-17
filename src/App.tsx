import { IconSprite } from "./components/IconSprite";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { Home } from "./pages/Home";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <IconSprite />
      <SiteHeader />
      <Home />
      <SiteFooter />
    </>
  );
}
