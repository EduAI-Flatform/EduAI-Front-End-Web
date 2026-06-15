import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "./auth-store";

export function ProtectedRoute() {
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

  return <Outlet />;
}
