import { Audiences } from "../components/Audiences";
import { CtaBanner } from "../components/CtaBanner";
import { Features } from "../components/Features";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { Platforms } from "../components/Platforms";
import { Pricing } from "../components/Pricing";
import { Trust } from "../components/Trust";
import { ZonePanel } from "../components/ZonePanel";

export function Home() {
  return (
    <main id="main">
      <Hero />
      <HowItWorks />
      <Features />
      <Audiences />
      <ZonePanel />
      <Trust />
      <Platforms />
      <Pricing />
      <CtaBanner />
    </main>
  );
}
