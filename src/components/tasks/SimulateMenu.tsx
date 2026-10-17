import { useOps } from "../../state/OperationsContext";
import { Button } from "../ui/Button";
import { Menu, MenuItem } from "../ui/Menu";

export function SimulateMenu({ taskId }: { taskId?: string }) {
  const ops = useOps();
  const workspace = ops.workspace;
  if (!workspace) return null;

  const explicit = taskId ? workspace.tasks.find((task) => task.id === taskId) : undefined;
  const booking =
    explicit ??
    workspace.tasks.find((task) => task.status === "confirmed" || task.status === "awaiting_confirmation" || task.status === "at_risk");
  const pending = explicit?.confirmation === "pending" ? explicit : workspace.tasks.find((task) => task.confirmation === "pending");
  const assigned =
    explicit?.cleanerId && explicit.status !== "completed" && explicit.status !== "in_progress"
      ? explicit
      : workspace.tasks.find((task) => task.cleanerId && task.status !== "completed" && task.status !== "in_progress");

  return (
    <Menu
      label={
        <Button variant="secondary" size="sm">
          Actions
        </Button>
      }
    >
      {(close) => (
        <div className="w-72">
          <p className="px-3 py-2 text-xs text-muted">These actions update the schedule on the server.</p>
          <MenuItem
            disabled={!booking || booking.status === "completed" || booking.status === "in_progress"}
            onClick={() => {
              if (booking) ops.simulateBookingChange(booking.id);
              close();
            }}
          >
            Shift booking by one day
          </MenuItem>
          <MenuItem
            disabled={!pending}
            onClick={() => {
              if (pending) ops.simulateAccept(pending.id);
              close();
            }}
          >
            Record cleaner acceptance
          </MenuItem>
          <MenuItem
            disabled={!pending}
            onClick={() => {
              if (pending) ops.simulateDecline(pending.id);
              close();
            }}
          >
            Record cleaner decline
          </MenuItem>
          <MenuItem
            disabled={!assigned}
            onClick={() => {
              if (assigned) ops.simulateUnavailable(assigned.id);
              close();
            }}
          >
            Mark cleaner unavailable
          </MenuItem>
        </div>
      )}
    </Menu>
  );
}
