import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AssignmentSubmissionPage } from "./features/assignments/AssignmentSubmissionPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { CheckEmailPage } from "./features/auth/CheckEmailPage";
import { ClassroomJoinPage } from "./features/classroom";
import { CourseDetailPage } from "./features/courses/CourseDetailPage";
import { CoursesPage } from "./features/courses/CoursesPage";
import { InstructorDashboard } from "./features/dashboard/InstructorDashboard";
import { StudentDashboard } from "./features/dashboard/StudentDashboard";
import { HomePage } from "./features/home/HomePage";
import { LearningPage } from "./features/learning/LearningPage";
import { LibraryPage } from "./features/library/LibraryPage";
import { CommunityPage } from "./features/community/CommunityPage";
import { QuizAttemptPage } from "./features/quizzes/QuizAttemptPage";
import { AiChatPage } from "./features/ai/AiChatPage";
import { AiToolsPage } from "./features/ai/AiToolsPage";
import { CertificateVerificationPage } from "./features/certificates/CertificateVerificationPage";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";

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
    location.pathname === "/check-email";
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
    !isQuizRoute &&
    !isAssignmentRoute &&
    !isClassroomRoute;
  const showAppFooter = showAppChrome && !isLearningRoute;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showAppChrome ? <Header /> : null}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/library" element={<LibraryPage />} />
          </Route>
          <Route path="/community" element={<CommunityPage />} />
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
          <Route element={<ProtectedRoute />}>
            <Route path="/learning/:courseId" element={<LearningPage />} />
            <Route path="/quizzes/:quizId/take" element={<QuizAttemptPage />} />
            <Route path="/assignments/:assignmentId/submit" element={<AssignmentSubmissionPage />} />
            <Route path="/classroom-sessions/:sessionId" element={<ClassroomJoinPage />} />
            <Route path="/dashboard/*" element={<StudentDashboard />} />
            <Route path="/instructor/dashboard/*" element={<InstructorDashboard />} />
            <Route path="/admin/dashboard/*" element={<StudentDashboard />} />
            <Route path="/profile" element={<Navigate replace to="/dashboard/profile" />} />
          </Route>
        </Routes>
      </main>

      {showAppFooter ? <Footer /> : null}
    </div>
  );
}
