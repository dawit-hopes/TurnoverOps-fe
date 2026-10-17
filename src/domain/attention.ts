import { formatDay, zonedDateKey } from "./format";
import type { AttentionItem, Workspace } from "./types";

export function deriveAttention(workspace: Workspace, now = new Date()): AttentionItem[] {
  const timeZone = workspace.settings.timeZone;
  const today = zonedDateKey(now.toISOString(), timeZone);
  const items: AttentionItem[] = [];

  for (const property of workspace.properties) {
    if (property.calendarState !== "failed") continue;
    const repeated = property.syncFailureCount > 1;
    items.push({
      id: `attention_${property.id}`,
      severity: "warning",
      kind: "calendar_failed",
      title: `${property.name}'s calendar has not synced successfully.`,
      explanation: repeated
        ? `The last ${property.syncFailureCount} attempts failed. ${property.calendarError ?? "Check the calendar link and try again."}`
        : (property.calendarError ?? "Check the calendar link and try again."),
      actionLabel: "Review property",
      propertyId: property.id,
    });
  }

  for (const task of workspace.tasks) {
    if (task.hostResolved) continue;
    const property = workspace.properties.find((item) => item.id === task.propertyId);
    const propertyName = property?.name ?? "A property";
    const conflict = workspace.conflicts.find((item) => item.taskId === task.id && item.status === "unresolved");
    const when = zonedDateKey(task.windowStart, timeZone) === today ? "today" : formatDay(task.windowStart, timeZone);

    if (task.status === "blocked" || task.status === "unassigned") {
      const declined = task.confirmation === "declined" || task.declinedCleanerIds.length > 0;
      items.push({
        id: `attention_${task.id}`,
        severity: "urgent",
        kind: declined ? "declined_no_replacement" : "no_cleaner",
        title: declined
          ? `${propertyName} still has no cleaner after a decline.`
          : `${propertyName} has no available cleaner for ${when}'s turnover.`,
        explanation: conflict?.brief || task.brief || "This cleaning needs a decision.",
        actionLabel: "Review conflict",
        taskId: task.id,
        propertyId: task.propertyId,
        conflictId: conflict?.id,
      });
      continue;
    }

    if (task.status === "at_risk" && task.confirmation === "pending") {
      const cleaner = workspace.cleaners.find((item) => item.id === task.cleanerId);
      items.push({
        id: `attention_${task.id}`,
        severity: "warning",
        kind: "unconfirmed_urgent",
        title: `${propertyName} is still waiting for ${cleaner?.name ?? "the cleaner"} to confirm ${when}'s cleaning.`,
        explanation: "The assignment stays pending until the cleaner accepts. Nothing has been marked confirmed.",
        actionLabel: "View task",
        taskId: task.id,
        propertyId: task.propertyId,
        conflictId: workspace.conflicts.find((item) => item.taskId === task.id)?.id,
      });
    }
  }

  return items.sort((a, b) => Number(b.severity === "urgent") - Number(a.severity === "urgent"));
}
