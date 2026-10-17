import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ActivityPage } from "../features/activity/ActivityPage";
import { GoogleCalendarCallback } from "../features/auth/GoogleCalendarCallback";
import { SignInPage } from "../features/auth/SignInPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { CleanersPage } from "../features/cleaners/CleanersPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { PropertiesPage } from "../features/properties/PropertiesPage";
import { RejectAssignmentPage } from "../features/cleaners/RejectAssignmentPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { useOps } from "../state/OperationsContext";

function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6 text-center shadow-sm" role="status" aria-live="polite">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-ink">Loading your workspace</p>
        <p className="mt-1 text-xs text-muted">Getting your properties, cleanings, and schedule ready.</p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-accent-soft" aria-hidden="true">
          <div className="h-full w-1/3 animate-[progress_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
      </div>
    </main>
  );
}

function HomeRedirect() {
  const { ready, host, onboardingComplete, workspaceLoading } = useOps();
  if (!ready) return <Loading />;
  if (!host) return <Navigate to="/sign-in" replace />;
  if (workspaceLoading) return <Loading />;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/overview" replace />;
}

export function App() {
  const { ready, host, onboardingComplete, workspaceLoading, openTask } = useOps();
  const location = useLocation();
  const taskId = new URLSearchParams(location.search).get("task");
  useEffect(() => {
    if (taskId) openTask(taskId);
  }, [taskId, openTask]);
  if (!ready) return <Loading />;
  if (workspaceLoading) return <Loading />;
  const dashboardReady = onboardingComplete;

  return (
    <Routes>
      <Route path="/integrations/google-calendar" element={<GoogleCalendarCallback />} />
      <Route path="/reject/:token" element={<RejectAssignmentPage />} />
      <Route
        path="/sign-in"
        element={host ? <Navigate to={dashboardReady ? "/overview" : "/onboarding"} replace /> : <SignInPage />}
      />
      <Route
        path="/onboarding"
        element={!host ? <Navigate to="/sign-in" replace /> : dashboardReady ? <Navigate to="/overview" replace /> : <OnboardingPage />}
      />
      <Route element={host && dashboardReady ? <AppShell /> : <HomeRedirect />}>
        <Route path="/" element={<OverviewPage />} />
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
