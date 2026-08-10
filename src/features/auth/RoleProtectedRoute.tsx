import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "./auth-store";

export function RoleProtectedRoute({
  allowedRoles,
}: {
  allowedRoles: string[];
}) {
  const session = useAuthSession();
  const location = useLocation();

  if (!session) {
    const redirectTo = `${location.pathname}${location.search}`;

    return (
      <Navigate
        replace
        to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
      />
    );
  }

  if (!allowedRoles.some((role) => session.user.roles.includes(role))) {
    return <Navigate replace to={getDashboardPath(session.user.roles)} />;
  }

  return <Outlet />;
}

function getDashboardPath(roles: string[]): string {
  if (roles.includes("platform_admin") || roles.includes("admin")) {
    return "/admin/dashboard";
  }

  if (roles.includes("instructor")) {
    return "/instructor/dashboard";
  }

  return "/dashboard";
}
