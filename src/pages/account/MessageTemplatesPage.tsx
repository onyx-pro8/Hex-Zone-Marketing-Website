import { Bell, MessageSquareText, UserPlus } from "lucide-react";
import {
  AccountSettingsFrame,
  SettingsCategoryLink,
} from "../../components/account/AccountSettingsFrame";

export function MessageTemplatesPage() {
  return (
    <AccountSettingsFrame
      title="Message Template"
      lead="Arrival, alert, and welcome copy"
      backTo="/account-settings"
    >
      <div className="settings-nav-list">
        <SettingsCategoryLink
          to="/account-settings/message-templates/arrival"
          title="Arrival messages"
          subtitle="Copy guests see when they arrive"
          icon={<MessageSquareText size={18} />}
        />
        <SettingsCategoryLink
          to="/account-settings/message-templates/alerts"
          title="Quick alert messages"
          subtitle="Preset text for the alert buttons"
          icon={<Bell size={18} />}
        />
        <SettingsCategoryLink
          to="/account-settings/message-templates/welcome"
          title="Member welcome message"
          subtitle="Greeting when an invited member joins"
          icon={<UserPlus size={18} />}
        />
      </div>
    </AccountSettingsFrame>
  );
}
