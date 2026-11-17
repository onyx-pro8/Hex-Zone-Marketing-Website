import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { FaqPage } from "./pages/FaqPage";
import { Home } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { PricingPage } from "./pages/PricingPage";
import { SecurityPrivacyPage } from "./pages/SecurityPrivacyPage";
import { SmartHomePage } from "./pages/SmartHomePage";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="smart-home" element={<SmartHomePage />} />
          <Route path="security-privacy" element={<SecurityPrivacyPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
