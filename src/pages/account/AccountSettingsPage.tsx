import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  History,
  KeyRound,
  LogOut,
  MessageSquareText,
  Ruler,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import {
  AccountSettingsFrame,
  SettingsCategoryLink,
} from "../../components/account/AccountSettingsFrame";
import { hasSystemAccess, isSystemAdministrator } from "../../lib/privateAccount";

export function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canGrantPermission = isSystemAdministrator(user);
  const showZoneSize = hasSystemAccess(user);

  function onLogout() {
    if (!window.confirm("Are you sure you want to log out?")) return;
    logout();
    navigate("/");
  }

  return (
    <AccountSettingsFrame
      title="Account settings"
      lead="Choose a category to manage"
    >
      <div className="settings-nav-list">
        <SettingsCategoryLink
          to="/account-settings/notifications"
          title="Notification"
          subtitle="Push alerts for this device"
          icon={<Bell size={18} />}
        />
        <SettingsCategoryLink
          to="/account-settings/devices"
          title="Device"
          subtitle="Manage registered phones and hubs"
          icon={<Smartphone size={18} />}
        />
        <SettingsCategoryLink
          to="/account-settings/message-templates"
          title="Message Template"
          subtitle="Arrival, alert, and welcome copy"
          icon={<MessageSquareText size={18} />}
        />
        <SettingsCategoryLink
          to="/account-settings/access-history"
          title="Access history"
          subtitle="Guest access permission messages"
          icon={<History size={18} />}
        />
        {canGrantPermission ? (
          <SettingsCategoryLink
            to="/account-settings/permission"
            title="Permission"
            subtitle="Give Technical Support access"
            icon={<KeyRound size={18} />}
          />
        ) : null}
        {showZoneSize ? (
          <SettingsCategoryLink
            to="/account-settings/zone-size"
            title="Zone size limit"
            subtitle="Each zone and the account total"
            icon={<Ruler size={18} />}
          />
        ) : null}
        <SettingsCategoryLink
          to="/account-settings/apis"
          title="APIs"
          subtitle="Explore and try API endpoints"
          icon={<BookOpen size={18} />}
        />
      </div>
      <button
        className="btn btn--outline settings-logout"
        type="button"
        onClick={onLogout}
      >
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </AccountSettingsFrame>
  );
}
