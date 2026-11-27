import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { AboutPage } from "./pages/AboutPage";
import { AccountPage } from "./pages/AccountPage";
import { AccessHistoryPage } from "./pages/account/AccessHistoryPage";
import { AccountSettingsPage } from "./pages/account/AccountSettingsPage";
import { ApiExplorerPage } from "./pages/account/ApiExplorerPage";
import { ArrivalMessagesPage } from "./pages/account/ArrivalMessagesPage";
import { DevicesPage } from "./pages/account/DevicesPage";
import { MessageTemplatesPage } from "./pages/account/MessageTemplatesPage";
import { NotificationSettingsPage } from "./pages/account/NotificationSettingsPage";
import { PermissionSettingsPage } from "./pages/account/PermissionSettingsPage";
import { QuickAlertsPage } from "./pages/account/QuickAlertsPage";
import { WelcomeMessagePage } from "./pages/account/WelcomeMessagePage";
import { ZoneSizePage } from "./pages/account/ZoneSizePage";
import { CommunityPage } from "./pages/CommunityPage";
import { ContactPage } from "./pages/ContactPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateAccountPage } from "./pages/CreateAccountPage";
import { FaqPage } from "./pages/FaqPage";
import { Home } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { PricingPage } from "./pages/PricingPage";
import { SecurityPrivacyPage } from "./pages/SecurityPrivacyPage";
import { SmartHomePage } from "./pages/SmartHomePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="register" element={<CreateAccountPage />} />
            <Route path="signup" element={<Navigate to="/register" replace />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="account-settings" element={<AccountSettingsPage />} />
            <Route path="account-settings/notifications" element={<NotificationSettingsPage />} />
            <Route path="account-settings/devices" element={<DevicesPage />} />
            <Route path="account-settings/message-templates" element={<MessageTemplatesPage />} />
            <Route path="account-settings/message-templates/arrival" element={<ArrivalMessagesPage />} />
            <Route path="account-settings/message-templates/alerts" element={<QuickAlertsPage />} />
            <Route path="account-settings/message-templates/welcome" element={<WelcomeMessagePage />} />
            <Route path="account-settings/access-history" element={<AccessHistoryPage />} />
            <Route path="account-settings/permission" element={<PermissionSettingsPage />} />
            <Route path="account-settings/zone-size" element={<ZoneSizePage />} />
            <Route path="account-settings/apis" element={<ApiExplorerPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
