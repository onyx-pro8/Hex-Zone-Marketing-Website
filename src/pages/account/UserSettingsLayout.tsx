import { Outlet } from "react-router-dom";
import { CreditCard, KeyRound, MapPin, UserRound } from "lucide-react";
import { SettingsShell } from "../../components/account/AccountSettingsFrame";

export function UserSettingsLayout() {
  return (
    <SettingsShell
      eyebrow="Your account"
      title="User settings"
      lead="Profile, address, password, and subscription."
      items={[
        {
          type: "link",
          category: {
            to: "/account/profile",
            label: "Profile",
            hint: "Name, photo, and account type",
            icon: <UserRound size={18} />,
          },
        },
        {
          type: "link",
          category: {
            to: "/account/address",
            label: "Address & broadcast",
            hint: "Home address and the name neighbours see",
            icon: <MapPin size={18} />,
          },
        },
        {
          type: "link",
          category: {
            to: "/account/password",
            label: "Password",
            hint: "Change the password for this account",
            icon: <KeyRound size={18} />,
          },
        },
        {
          type: "link",
          category: {
            to: "/account/subscription",
            label: "Subscription",
            hint: "Plan and billing",
            icon: <CreditCard size={18} />,
          },
        },
      ]}
    >
      <Outlet />
    </SettingsShell>
  );
}
