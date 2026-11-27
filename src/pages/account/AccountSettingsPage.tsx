import { Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  History,
  KeyRound,
  LogOut,
  MessageSquareText,
  Ruler,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { SettingsShell } from "../../components/account/AccountSettingsFrame";
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

  const items = [
    {
      type: "link" as const,
      category: {
        to: "/account-settings/notifications",
        label: "Notification",
        hint: "Push alerts for this device",
        icon: <Bell size={18} />,
      },
    },
    {
      type: "link" as const,
      category: {
        to: "/account-settings/devices",
        label: "Device",
        hint: "Manage registered phones and hubs",
        icon: <Smartphone size={18} />,
      },
    },
    {
      type: "group" as const,
      label: "Message Template",
      categories: [
        {
          to: "/account-settings/message-templates/arrival",
          label: "Arrival messages",
          hint: "Copy guests see when they arrive",
          icon: <MessageSquareText size={18} />,
        },
        {
          to: "/account-settings/message-templates/alerts",
          label: "Quick alert messages",
          hint: "Preset text for the alert buttons",
          icon: <Bell size={18} />,
        },
        {
          to: "/account-settings/message-templates/welcome",
          label: "Member welcome",
          hint: "Greeting when an invited member joins",
          icon: <UserPlus size={18} />,
        },
      ],
    },
    {
      type: "link" as const,
      category: {
        to: "/account-settings/access-history",
        label: "Access history",
        hint: "Guest access permission messages",
        icon: <History size={18} />,
      },
    },
  ];

  if (canGrantPermission) {
    items.push({
      type: "link",
      category: {
        to: "/account-settings/permission",
        label: "Permission",
        hint: "Give Technical Support access",
        icon: <KeyRound size={18} />,
      },
    });
  }
  if (showZoneSize) {
    items.push({
      type: "link",
      category: {
        to: "/account-settings/zone-size",
        label: "Zone size limit",
        hint: "Each zone and the account total",
        icon: <Ruler size={18} />,
      },
    });
  }
  items.push({
    type: "link",
    category: {
      to: "/account-settings/apis",
      label: "APIs",
      hint: "Explore and try API endpoints",
      icon: <BookOpen size={18} />,
    },
  });

  return (
    <SettingsShell
      eyebrow="Your account"
      title="Account settings"
      lead="Choose a category to manage"
      items={items}
      footer={
        <button className="btn btn--outline settings-logout" type="button" onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" />
          Log out
        </button>
      }
    >
      <Outlet />
    </SettingsShell>
  );
}
