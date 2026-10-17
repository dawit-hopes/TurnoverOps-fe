import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useOps } from "../../state/OperationsContext";
import { ConflictDrawer } from "../tasks/ConflictDrawer";
import { TaskDrawer } from "../tasks/TaskDrawer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const pages: Record<string, { title: string; subtitle: string }> = {
  "/overview": {
    title: "Overview",
    subtitle: "Here is the status of your property operations.",
  },
  "/calendar": {
    title: "Calendar",
    subtitle: "Checkouts, cleanings, and check-ins for the week.",
  },
  "/tasks": {
    title: "Cleaning Tasks",
    subtitle: "Search, filter, and open any turnover.",
  },
  "/cleaners": {
    title: "Cleaners",
    subtitle: "Availability and workload.",
  },
  "/properties": {
    title: "Properties",
    subtitle: "Calendar links, defaults, and the next turnover.",
  },
  "/activity": {
    title: "Activity Log",
    subtitle: "Reservation changes, assignments, notifications, and overrides.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Account, scheduling rules, and connections.",
  },
};

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const page = pages[pathname] ?? pages["/overview"];
  const { notice, dismissNotice } = useOps();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-60">
        <Header title={page.title} subtitle={page.subtitle} onMenu={() => setOpen(true)} />
        {notice ? (
          <div role="status" className="flex items-start justify-between gap-4 border-b border-line bg-white px-4 py-2 text-sm sm:px-6">
            <p>{notice}</p>
            <button type="button" className="shrink-0 text-muted hover:text-ink" onClick={dismissNotice}>
              Dismiss
            </button>
          </div>
        ) : null}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <TaskDrawer />
      <ConflictDrawer />
    </div>
  );
}
