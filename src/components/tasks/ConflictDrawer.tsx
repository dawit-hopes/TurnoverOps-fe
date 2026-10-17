import { needsDecision } from "../../domain/decisionCopy";
import { useOps } from "../../state/OperationsContext";
import { Drawer } from "../ui/Drawer";
import { DecisionPanel } from "./DecisionPanel";

export function ConflictDrawer() {
  const { workspace, selectedConflictId, closePanels } = useOps();
  const conflict = workspace?.conflicts.find((item) => item.id === selectedConflictId);
  const task = workspace?.tasks.find((item) => item.id === conflict?.taskId);
  if (!workspace || !conflict || !task) return null;
  const property = workspace.properties.find((item) => item.id === task.propertyId);
  const open = needsDecision(task) || conflict.status === "unresolved";

  return (
    <Drawer title={property?.name ?? "Cleaning"} onClose={closePanels}>
      {open && !conflict.hostResolved ? (
        <div className="flex h-full min-h-0 flex-col">
          <DecisionPanel taskId={task.id} onLater={closePanels} conflictChatFill />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">Resolved</p>
          <h3 className="text-xl font-semibold tracking-tight">This no longer needs a decision</h3>
          <p className="max-w-xl text-sm leading-6">{conflict.brief || "The schedule was updated."}</p>
        </div>
      )}
    </Drawer>
  );
}
