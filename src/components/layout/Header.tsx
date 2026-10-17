import { Bell, Menu as MenuIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatFullDate, initials } from "../../domain/format";
import type { AttentionItem } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";
import { Menu, MenuItem } from "../ui/Menu";
import { SimulateMenu } from "../tasks/SimulateMenu";

export function Header({ title, subtitle, onMenu }: { title: string; subtitle: string; onMenu: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspace, host, attention, openConflict, openTask, loadSample, signOut } = useOps();
  const timeZone = workspace?.settings.timeZone ?? "Africa/Addis_Ababa";
  const today = formatFullDate(new Date().toISOString(), timeZone);

  function openAttention(item: AttentionItem) {
    if (item.conflictId) openConflict(item.conflictId);
    else if (item.taskId) openTask(item.taskId);
    else if (item.propertyId) navigate(`/properties?focus=${item.propertyId}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button type="button" className="rounded-md p-2 hover:bg-zinc-100 lg:hidden" aria-label="Open navigation" onClick={onMenu}>
          <MenuIcon size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted">{today}</p>
          </div>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
        {location.pathname === "/overview" ? <SimulateMenu /> : null}
        <Menu
          label={
            <button type="button" className="relative rounded-md p-2 hover:bg-zinc-100" aria-label={attention.length ? `Notifications, ${attention.length} unresolved` : "Notifications"}>
              <Bell size={18} />
              {attention.length > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" /> : null}
            </button>
          }
        >
          {(close) => (
            <div className="w-80">
              <p className="px-3 py-2 text-xs font-medium text-muted">Needs attention</p>
              {attention.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted">All caught up. No unresolved operational issues.</p>
              ) : (
                attention.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => {
                      openAttention(item);
                      close();
                    }}
                  >
                    <span className="block font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted">{item.explanation}</span>
                  </MenuItem>
                ))
              )}
            </div>
          )}
        </Menu>
        <Menu
          label={
            <button type="button" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-100" aria-label="Account menu">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-xs font-semibold">{initials(host?.name ?? "Host")}</span>
            </button>
          }
        >
          {(close) => (
            <div className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{host?.name}</p>
                <p className="text-xs text-muted">{host?.email}</p>
              </div>
              <MenuItem
                onClick={() => {
                  void loadSample();
                  close();
                  navigate("/overview");
                }}
              >
                Load sample reservations
              </MenuItem>
              <MenuItem
                onClick={() => {
                  signOut();
                  close();
                  navigate("/sign-in");
                }}
              >
                Sign out
              </MenuItem>
            </div>
          )}
        </Menu>
      </div>
    </header>
  );
}
