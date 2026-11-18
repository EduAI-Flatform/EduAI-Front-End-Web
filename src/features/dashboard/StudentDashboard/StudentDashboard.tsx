import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import { ClassroomDashboard } from "../../classroom";
import { MyLearningPage } from "./MyLearningPage";
import { LibraryPage } from "../../library/LibraryPage";
import { StudentDashboardHome } from "./StudentDashboardHome";
import { StudentProfilePage } from "./StudentProfilePage";
import { StudentSidebar } from "./StudentSidebar";
import { AiChatPage } from "../../ai/AiChatPage";
import { AiToolsPage } from "../../ai/AiToolsPage";
import { CertificatesPage } from "../../certificates/CertificatesPage";
import { CommunityPage } from "../../community/CommunityPage";
import { DashboardRouteState } from "../DashboardRouteState";
import { TmiRewardsPage } from "./TmiRewardsPage/TmiRewardsPage";
import { LearningPathDashboard } from "./LearningPathDashboard";
import { JobApplicationsPage } from "../../jobs/JobApplicationsPage";
import { MentorDirectoryPage } from "../../mentors/MentorDirectoryPage";
import { MentorBookingsPage } from "../../mentors/MentorBookingsPage";
import { BillingPage } from "../../account/BillingPage";
import { AccountSettingsPage } from "../../account/AccountSettingsPage";
import { MembershipCardsPage } from "../../membership-cards/MembershipCardsPage";
import { GdsWalletPage } from "../../wallet/GdsWalletPage";
import { SupportPage } from "../../requests/SupportPage";
import { AffiliatePage } from "../../affiliate/AffiliatePage";
import { OrderDetailPage } from "../../commerce/OrderDetailPage";
import "./StudentDashboard.css";

type StudentDashboardView =
  | "home"
  | "learning"
  | "classrooms"
  | "library"
  | "community"
  | "profile"
  | "ai"
  | "ai-tools"
  | "certificates"
  | "tmi"
  | "learning-path"
  | "job-applications"
  | "mentors"
  | "mentor-bookings"
  | "billing" | "billing-order" | "wallet" | "membership" | "settings" | "support" | "affiliate"
  | "unavailable";

export function getStudentDashboardView(pathname: string): StudentDashboardView {
  if (pathname === "/billing") return "billing";
  if (pathname.startsWith("/billing/orders/")) return "billing-order";
  if (pathname === "/wallet/gds") return "wallet";
  if (pathname === "/membership-cards") return "membership";
  if (pathname === "/settings") return "settings";
  if (pathname === "/support") return "support";
  if (pathname === "/affiliate") return "affiliate";
  if (/^\/dashboard\/?$/.test(pathname)) return "home";
  if (pathname === "/dashboard/learning") return "learning";
  if (pathname === "/dashboard/classrooms") return "classrooms";
  if (pathname === "/dashboard/library") return "library";
  if (pathname === "/dashboard/community") return "community";
  if (pathname === "/dashboard/profile") return "profile";
  if (pathname === "/dashboard/ai/tools") return "ai-tools";
  if (pathname === "/dashboard/ai") return "ai";
  if (pathname === "/dashboard/certificates") return "certificates";
  if (pathname === "/dashboard/tmi") return "tmi";
  if (pathname === "/dashboard/learning-path") return "learning-path";
  if (pathname === "/dashboard/job-applications") return "job-applications";
  if (pathname === "/dashboard/mentors") return "mentors";
  if (pathname === "/dashboard/mentor-bookings") return "mentor-bookings";

  return "unavailable";
}

export function StudentDashboard() {
  const session = useAuthSession();
  const location = useLocation();
  const firstName =
    session?.user.fullName?.trim().split(/\s+/).slice(-1)[0] ?? "bạn";
  const pageView = getStudentDashboardView(location.pathname);
  let pageContent: ReactNode;

  if (pageView === "billing") {
    pageContent = <BillingPage />;
  } else if (pageView === "billing-order") {
    pageContent = <OrderDetailPage />;
  } else if (pageView === "wallet") {
    pageContent = <GdsWalletPage />;
  } else if (pageView === "membership") {
    pageContent = <MembershipCardsPage />;
  } else if (pageView === "settings") {
    pageContent = <AccountSettingsPage />;
  } else if (pageView === "support") {
    pageContent = <SupportPage />;
  } else if (pageView === "affiliate") {
    pageContent = <AffiliatePage />;
  } else if (pageView === "learning") {
    pageContent = <MyLearningPage />;
  } else if (pageView === "classrooms") {
    pageContent = <ClassroomDashboard mode="student" />;
  } else if (pageView === "library") {
    pageContent = <LibraryPage />;
  } else if (pageView === "community") {
    pageContent = <CommunityPage />;
  } else if (pageView === "profile") {
    pageContent = <StudentProfilePage />;
  } else if (pageView === "ai-tools") {
    pageContent = <AiToolsPage />;
  } else if (pageView === "ai") {
    pageContent = <AiChatPage />;
  } else if (pageView === "certificates") {
    pageContent = <CertificatesPage />;
  } else if (pageView === "tmi") {
    pageContent = <TmiRewardsPage />;
  } else if (pageView === "learning-path") {
    pageContent = <LearningPathDashboard />;
  } else if (pageView === "job-applications") {
    pageContent = <JobApplicationsPage />;
  } else if (pageView === "mentors") {
    pageContent = <MentorDirectoryPage />;
  } else if (pageView === "mentor-bookings") {
    pageContent = <MentorBookingsPage mode="student" />;
  } else if (pageView === "home") {
    pageContent = <StudentDashboardHome firstName={firstName} />;
  } else {
    pageContent = <DashboardRouteState backPath="/dashboard" />;
  }

  return (
    <section className="student-dashboard">
      <StudentSidebar />
      <main className="student-dashboard__content"><DashboardAccountBar />{pageContent}</main>
    </section>
  );
}
import { DashboardAccountBar } from '../../../components/layout/DashboardAccountBar';
