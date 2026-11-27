import { Navigate } from "react-router-dom";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { PermissionWorkspace } from "../../components/dashboard/PermissionWorkspace";
import { useAuth } from "../../auth/useAuth";
import { isSystemAdministrator } from "../../lib/privateAccount";

export function PermissionSettingsPage() {
  const { user, token, loading } = useAuth();
  if (!loading && token && !isSystemAdministrator(user)) {
    return <Navigate to="/account-settings" replace />;
  }

  return (
    <AccountSettingsFrame
      title="Permission"
      lead="Give Technical Support access"
      backTo="/account-settings"
      wide
    >
      <PermissionWorkspace />
    </AccountSettingsFrame>
  );
}
