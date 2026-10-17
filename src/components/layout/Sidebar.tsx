import { Building2, CalendarDays, LayoutDashboard, ListChecks, ScrollText, Settings, Users, X } from "lucide-react";
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
  const { host, attention, signOut } = useOps();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink/30 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-line bg-white shadow-xl transition-transform duration-200 ease-in-out lg:w-60 lg:shadow-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <button
            type="button"
            className="rounded-md p-1.5 text-muted hover:bg-zinc-100 lg:hidden cursor-pointer"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={18} />
          </button>
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
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
