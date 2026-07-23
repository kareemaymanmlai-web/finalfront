import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loading } from "./components/Loading";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { useOrganization } from "./contexts/OrganizationContext";
import { LearningProvider } from "./contexts/LearningContext";
import { CreateAccountPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "./pages/AuthCyclePages";
import { EndUserApp } from "./pages/EndUserApp";
import { LoginPage } from "./pages/LoginPage";
import { RolePicker } from "./pages/RolePicker";
import { SuperAdminApp } from "./pages/SuperAdminApp";
import { TenantAdminApp } from "./pages/TenantAdminApp";
import { WorkspaceSelectionPage } from "./pages/WorkspaceSelectionPage";
import {
  CompanyOnboardingPage,
  InviteAcceptPage,
  JoinWorkspacePage,
  LegalPage,
  NoWorkspacePage,
  NotFoundPage,
  RegisterCompanyPage
} from "./pages/WorkspaceFlowPages";
import { api } from "./services/api";
import {
  AcademiesPage,
  AcademyProfilePage,
  BookingSuccessPage,
  CourseDetailsPage,
  CoursesMarketplacePage,
  PublicBookingPage
} from "./pages/MarketplacePages";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create-account" element={<CreateAccountPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/workspace" element={<LandingRedirect />} />
      <Route path="/choose" element={<LandingRedirect />} />
      <Route path="/" element={<MarketingLandingRedirect />} />
      <Route path="/register-company" element={<RegisterCompanyPage />} />
      <Route path="/company-onboarding" element={<CompanyOnboardingPage />} />
      <Route path="/join" element={<JoinWorkspacePage />} />
      <Route path="/no-workspace" element={<NoWorkspacePage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/privacy" element={<LegalPage type="privacy" />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
      <Route path="/support" element={<LegalPage type="support" />} />
      <Route path="/courses" element={<CoursesMarketplacePage />} />
      <Route path="/courses/:courseSlug" element={<CourseDetailsPage />} />
      <Route path="/academies" element={<AcademiesPage />} />
      <Route path="/academies/:academySlug" element={<AcademyProfilePage />} />
      <Route path="/booking/:courseId" element={<PublicBookingPage />} />
      <Route path="/booking/success" element={<BookingSuccessPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/workspaces" element={<WorkspaceSelectionPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["end-user"]} />}>
        <Route path="/end-user" element={<Navigate to="/end-user/home" replace />} />
        <Route path="/end-user/:page" element={<DataGate app="endUser" />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["tenant-admin"]} />}>
        <Route path="/tenant-admin" element={<Navigate to="/tenant-admin/dashboard" replace />} />
        <Route path="/tenant-admin/:page" element={<DataGate app="tenant" />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["super-admin"]} />}>
        <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="/super-admin/:page" element={<DataGate app="platform" />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function LandingRedirect() {
  return <RolePicker />;
}

function MarketingLandingRedirect() {
  window.location.replace("/landing/index.html");
  return <Loading />;
}

function DataGate({ app }) {
  const { user } = useAuth();
  const { loading: organizationLoading, activeOrganization } = useOrganization();
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getRooms(),
      api.getFiles(),
      api.getMembers(),
      api.getTenants(),
      api.getNotifications(),
      api.getAnalytics("endUser"),
      api.getAnalytics("tenant"),
      api.getAnalytics("platform")
    ]).then(([rooms, files, members, tenants, notifications, endAnalytics, tenantAnalytics, platformAnalytics]) => {
      if (!mounted) return;
      setData({ rooms, files, members, tenants, notifications, endAnalytics, tenantAnalytics, platformAnalytics });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const appData = useMemo(() => {
    if (!data) return null;
    return {
      endUser: { rooms: data.rooms, files: data.files, notifications: data.notifications, analytics: data.endAnalytics },
      tenant: { rooms: data.rooms, files: data.files, members: data.members, notifications: data.notifications, analytics: data.tenantAnalytics },
      platform: { tenants: data.tenants, analytics: data.platformAnalytics }
    };
  }, [data]);

  if (!appData || organizationLoading) return <Loading />;
  if (user.role !== "super-admin" && !activeOrganization) return <Navigate to="/workspaces" replace />;
  const content = app === "endUser"
    ? <EndUserApp data={appData.endUser} user={user} />
    : app === "tenant"
      ? <TenantAdminApp data={appData.tenant} user={user} />
      : <SuperAdminApp data={appData.platform} user={user} />;

  return (
    <WorkspaceProvider key={activeOrganization?.id || "platform"} initialData={data}>
      <LearningProvider>{content}</LearningProvider>
    </WorkspaceProvider>
  );
}
