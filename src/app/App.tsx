import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ActivityPage } from "../features/activity/ActivityPage";
import { GoogleCalendarCallback } from "../features/auth/GoogleCalendarCallback";
import { SignInPage } from "../features/auth/SignInPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { CleanersPage } from "../features/cleaners/CleanersPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { PropertiesPage } from "../features/properties/PropertiesPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { useOps } from "../state/OperationsContext";

function Loading() {
  return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading workspace…</div>;
}

function HomeRedirect() {
  const { ready, host, onboardingComplete, planApproved } = useOps();
  if (!ready) return <Loading />;
  if (!host) return <Navigate to="/sign-in" replace />;
  if (!onboardingComplete || !planApproved) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/overview" replace />;
}

export function App() {
  const { ready, host, onboardingComplete, planApproved } = useOps();
  if (!ready) return <Loading />;
  const dashboardReady = onboardingComplete && planApproved;

  return (
    <Routes>
      <Route path="/integrations/google-calendar" element={<GoogleCalendarCallback />} />
      <Route
        path="/sign-in"
        element={host ? <Navigate to={dashboardReady ? "/overview" : "/onboarding"} replace /> : <SignInPage />}
      />
      <Route
        path="/onboarding"
        element={!host ? <Navigate to="/sign-in" replace /> : dashboardReady ? <Navigate to="/overview" replace /> : <OnboardingPage />}
      />
      <Route element={host && dashboardReady ? <AppShell /> : <HomeRedirect />}>
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/cleaners" element={<CleanersPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
