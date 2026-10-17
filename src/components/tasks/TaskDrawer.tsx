import { needsDecision } from "../../domain/decisionCopy";
import { formatDateTime, formatDay, formatDuration, formatTime } from "../../domain/format";
import { useOps } from "../../state/OperationsContext";
import { StatusBadge } from "../ui/Badge";
import { Drawer } from "../ui/Drawer";
import { AssignmentMailStatus, DecisionPanel } from "./DecisionPanel";
import { SimulateMenu } from "./SimulateMenu";

export function TaskDrawer() {
  const { workspace, selectedTaskId, closePanels, retryCleanerEmail } = useOps();
  const task = workspace?.tasks.find((item) => item.id === selectedTaskId);
  if (!workspace || !task) return null;
  const timeZone = workspace.settings.timeZone;
  const property = workspace.properties.find((item) => item.id === task.propertyId);
  const cleaner = workspace.cleaners.find((item) => item.id === task.cleanerId);
  const reservation = workspace.reservations.find((item) => item.id === task.reservationId);

  if (needsDecision(task)) {
    return (
      <Drawer title={property?.name ?? "Cleaning"} onClose={closePanels}>
        <DecisionPanel taskId={task.id} onLater={closePanels} />
        <div className="mt-6 flex justify-end">
          <SimulateMenu taskId={task.id} />
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer title={property?.name ?? "Cleaning task"} onClose={closePanels}>
      <div className="space-y-5">
        <StatusBadge status={task.status} />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Guest" value={reservation?.guestName ?? "—"} />
          <Info label="Cleaning" value={formatDuration(task.durationMinutes)} />
          <Info label="Deadline" value={formatDateTime(task.deadline, timeZone)} />
          <Info label="Window" value={`${formatDay(task.windowStart, timeZone)}, ${formatTime(task.windowStart, timeZone)}–${formatTime(task.windowEnd, timeZone)}`} />
          <Info label="Cleaner" value={cleaner?.name ?? "Unassigned"} />
          {cleaner?.email ? <Info label="Email" value={cleaner.email} /> : null}
        </dl>
        <AssignmentMailStatus task={task} cleanerEmail={cleaner?.email} retryCleanerEmail={retryCleanerEmail} />
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer text-sm text-muted">Technical details</summary>
          {task.assignmentHistory.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No assignment events yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {task.assignmentHistory.map((event) => (
                <li key={event.id}>
                  <p className="text-sm">{event.summary}</p>
                  <p className="text-xs text-muted">
                    {formatDay(event.at, timeZone)} {formatTime(event.at, timeZone)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </details>
        <div className="flex justify-end">
          <SimulateMenu taskId={task.id} />
        </div>
      </div>
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
