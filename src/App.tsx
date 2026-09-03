import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, type ComponentType } from "react";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { RoleProtectedRoute } from "./features/auth/RoleProtectedRoute";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";

const AssignmentSubmissionPage = lazyNamed(
  () => import("./features/assignments/AssignmentSubmissionPage"),
  "AssignmentSubmissionPage",
);
const LoginPage = lazyNamed(() => import("./features/auth/LoginPage"), "LoginPage");
const RegisterPage = lazyNamed(() => import("./features/auth/RegisterPage"), "RegisterPage");
const CheckEmailPage = lazyNamed(() => import("./features/auth/CheckEmailPage"), "CheckEmailPage");
const OAuthCallbackPage = lazyNamed(
  () => import("./features/auth/OAuthCallbackPage"),
  "OAuthCallbackPage",
);
const ClassroomJoinPage = lazyNamed(() => import("./features/classroom"), "ClassroomJoinPage");
const CourseDetailPage = lazyNamed(
  () => import("./features/courses/CourseDetailPage"),
  "CourseDetailPage",
);
const CoursesPage = lazyNamed(() => import("./features/courses/CoursesPage"), "CoursesPage");
const CartPage = lazyNamed(() => import("./features/commerce/CartPage"), "CartPage");
const MembershipPage = lazyNamed(() => import("./features/memberships/MembershipPage"), "MembershipPage");
const PaymentReturnPage = lazyNamed(
  () => import("./features/payments/PaymentReturnPage"),
  "PaymentReturnPage",
);
const InstructorDashboard = lazyNamed(
  () => import("./features/dashboard/InstructorDashboard"),
  "InstructorDashboard",
);
const StudentDashboard = lazyNamed(
  () => import("./features/dashboard/StudentDashboard"),
  "StudentDashboard",
);
const AdminDashboard = lazyNamed(
  () => import("./features/dashboard/AdminDashboard"),
  "AdminDashboard",
);
const HomePage = lazyNamed(() => import("./features/home/HomePage"), "HomePage");
const LearningPage = lazyNamed(() => import("./features/learning/LearningPage"), "LearningPage");
const LibraryPage = lazyNamed(() => import("./features/library/LibraryPage"), "LibraryPage");
const CommunityPage = lazyNamed(() => import("./features/community/CommunityPage"), "CommunityPage");
const QuizAttemptPage = lazyNamed(
  () => import("./features/quizzes/QuizAttemptPage"),
  "QuizAttemptPage",
);
const AiChatPage = lazyNamed(() => import("./features/ai/AiChatPage"), "AiChatPage");
const AiToolsPage = lazyNamed(() => import("./features/ai/AiToolsPage"), "AiToolsPage");
const CertificateVerificationPage = lazyNamed(
  () => import("./features/certificates/CertificateVerificationPage"),
  "CertificateVerificationPage",
);
const PublicCareerProfilePage = lazyNamed(
  () => import("./features/career/PublicCareerProfilePage"),
  "PublicCareerProfilePage",
);
const JobsPage = lazyNamed(() => import("./features/jobs/JobsPage"), "JobsPage");
const JobDetailPage = lazyNamed(() => import("./features/jobs/JobDetailPage"), "JobDetailPage");
const PrivacyPage = lazyNamed(() => import("./features/legal/LegalPage"), "PrivacyPage");
const DataDeletionPage = lazyNamed(
  () => import("./features/legal/LegalPage"),
  "DataDeletionPage",
);

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType,
  }));
}

export function App() {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <AppFrame />
    </BrowserRouter>
  );
}

function AppFrame() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/check-email" ||
    location.pathname === "/auth/callback";
  const isDashboardRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/instructor/dashboard") ||
    location.pathname.startsWith("/admin/dashboard");
  const isLearningRoute = location.pathname.startsWith("/learning");
  const isQuizRoute = location.pathname.startsWith("/quizzes");
  const isAssignmentRoute = location.pathname.startsWith("/assignments");
  const isClassroomRoute = location.pathname.startsWith("/classroom-sessions");
  const showAppChrome =
    !isAuthRoute &&
    !isDashboardRoute &&
    !isLearningRoute &&
    !isQuizRoute &&
    !isAssignmentRoute &&
    !isClassroomRoute;
  const showAppFooter = showAppChrome && !isLearningRoute;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showAppChrome ? (
        <a className="skip-link" href="#main-content">
          Bỏ qua điều hướng
        </a>
      ) : null}
      {showAppChrome ? <Header /> : null}

      <Suspense
        fallback={
          <main className="flex-1" id="main-content" tabIndex={-1}>
            <RouteLoadingFallback />
          </main>
        }
      >
        <main className="flex-1" id="main-content" tabIndex={-1}>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<CartPage />} />
            <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/membership" element={<MembershipPage />} />
              <Route path="/payments/return" element={<PaymentReturnPage />} />
              <Route path="/payments/cancel" element={<PaymentReturnPage />} />
            </Route>
            <Route path="/library" element={<LibraryPage />} />
          </Route>
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/career/:publicSlug" element={<PublicCareerProfilePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/verify" element={<CertificateVerificationPage />} />
          <Route path="/verify/:code" element={<CertificateVerificationPage />} />
          <Route path="/certificates/verify/:code" element={<CertificateVerificationPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/ai" element={<AiChatPage />} />
            <Route path="/ai/tools" element={<AiToolsPage />} />
            <Route
              path="/certificates"
              element={<Navigate replace to="/dashboard/certificates" />}
            />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/learning/:courseId" element={<LearningPage />} />
            <Route path="/quizzes/:quizId/take" element={<QuizAttemptPage />} />
            <Route path="/assignments/:assignmentId/submit" element={<AssignmentSubmissionPage />} />
            <Route path="/classroom-sessions/:sessionId" element={<ClassroomJoinPage />} />
            <Route path="/dashboard/*" element={<StudentDashboard />} />
            <Route path="/profile" element={<Navigate replace to="/dashboard/profile" />} />
            <Route element={<RoleProtectedRoute allowedRoles={["instructor"]} />}>
              <Route path="/instructor/dashboard/*" element={<InstructorDashboard />} />
            </Route>
            <Route
              element={
                <RoleProtectedRoute allowedRoles={["platform_admin"]} />
              }
            >
              <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
            </Route>
          </Route>
          </Routes>
        </main>

        {showAppFooter ? <Footer /> : null}
      </Suspense>
    </div>
  );
}

function RouteLoadingFallback() {
  return (
    <div aria-live="polite" className="route-loading-fallback" role="status">
      Đang tải nội dung…
    </div>
  );
}
