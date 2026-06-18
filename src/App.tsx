import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { StudentDashboard } from "./features/dashboard/StudentDashboard";
import { HomePage } from "./features/home/HomePage";
import { ProfilePage } from "./features/profile/ProfilePage";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";

export function App() {
  return (
    <BrowserRouter>
      <AppFrame />
    </BrowserRouter>
  );
}

function AppFrame() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";
  const isDashboardRoute =
    location.pathname === "/dashboard" ||
    location.pathname === "/instructor/dashboard" ||
    location.pathname === "/admin/dashboard";
  const showAppChrome = !isAuthRoute && !isDashboardRoute;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showAppChrome ? <Header /> : null}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/instructor/dashboard" element={<StudentDashboard />} />
            <Route path="/admin/dashboard" element={<StudentDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </main>

      {showAppChrome ? <Footer /> : null}
    </div>
  );
}
