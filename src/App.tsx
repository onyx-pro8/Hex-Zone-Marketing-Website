import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { SmartHomePage } from "./pages/SmartHomePage";
import { ScrollToTop } from "./components/ScrollToTop";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="smart-home" element={<SmartHomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
