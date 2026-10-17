import { Building2, CalendarDays, LayoutDashboard, ListChecks, ScrollText, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { initials } from "../../domain/format";
import { useOps } from "../../state/OperationsContext";
import { Logo } from "./Logo";

const links: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: "/overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { to: "/calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  { to: "/tasks", label: "Cleaning Tasks", icon: <ListChecks size={16} /> },
  { to: "/cleaners", label: "Cleaners", icon: <Users size={16} /> },
  { to: "/properties", label: "Properties", icon: <Building2 size={16} /> },
  { to: "/activity", label: "Activity Log", icon: <ScrollText size={16} /> },
  { to: "/settings", label: "Settings", icon: <Settings size={16} /> },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { host, attention, signOut, loadSample } = useOps();

  return (
    <>
      {open ? <button type="button" className="fixed inset-0 z-30 bg-ink/25 lg:hidden" aria-label="Close navigation" onClick={onClose} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-white ${open ? "flex" : "hidden"} lg:flex`}>
        <div className="px-4 py-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-2" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-zinc-50"}`
              }
            >
              {link.icon}
              <span className="flex-1">{link.label}</span>
              {link.to === "/overview" && attention.length > 0 ? (
                <span className="h-2 w-2 rounded-full bg-danger" aria-label="Unresolved issues" />
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <p className="truncate text-sm font-medium">{host?.name}</p>
          <p className="truncate text-xs text-muted">{host?.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-xs font-semibold">{initials(host?.name ?? "Host")}</span>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => void loadSample()}>
              Load sample
            </button>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
