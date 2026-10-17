import type { PlanningRun } from "./types";

const REASON: Record<string, string> = {
  no_feasible_cleaner: "No available cleaner can finish this cleaning before the next check-in.",
  unassigned: "This cleaning is still unassigned.",
  overlap: "That cleaner is already booked at that time.",
  outside_working_hours: "That time is outside the cleaner's working hours.",
  working_hours: "That time is outside the cleaner's working hours.",
  capacity: "That cleaner has reached the daily job limit.",
  daily_capacity: "That cleaner has reached the daily job limit.",
  eligibility: "That cleaner is not available for this property.",
  ineligible: "That cleaner is not available for this property.",
  duration: "The proposed time does not match the length of the cleaning.",
  deadline: "The cleaning would finish after the next check-in.",
  duplicate_task: "This cleaning was listed more than once, so the extra copy was ignored.",
  locked_assignment: "Cleaning that is already underway was left unchanged.",
  still_feasible: "The current assignment still works, so it was kept.",
  invalid_task: "The plan referred to a cleaning that is not on this account.",
  invalid_cleaner: "The plan referred to a cleaner that is not on this account.",
  plan_identity: "The plan did not match this day, so it was not saved.",
};

export const PLANNING_STAGE_IDS = [
  "synchronizing_calendars",
  "reconciling_reservations",
  "reviewing_assignments",
  "coordinating_schedule",
  "validating_plan",
  "saving_changes",
] as const;

export const PLANNING_STAGE_NOW: Record<(typeof PLANNING_STAGE_IDS)[number], string> = {
  synchronizing_calendars: "Checking the property calendars.",
  reconciling_reservations: "Matching reservations to cleaning tasks.",
  reviewing_assignments: "Reviewing the assignments already on the schedule.",
  coordinating_schedule: "Working out who can take each cleaning.",
  validating_plan: "Checking the plan against working hours and deadlines.",
  saving_changes: "Saving the assignments that should change.",
};

export const PLANNING_STAGE_DONE: Record<(typeof PLANNING_STAGE_IDS)[number], string> = {
  synchronizing_calendars: "Calendars checked.",
  reconciling_reservations: "Reservations matched to cleaning tasks.",
  reviewing_assignments: "Existing assignments reviewed.",
  coordinating_schedule: "The schedule has been worked out.",
  validating_plan: "The plan fits the working hours and deadlines.",
  saving_changes: "Changes saved.",
};

const RUN_STATUS: Record<string, string> = {
  running: "The plan is still being prepared.",
  completed: "The plan was saved.",
  partial: "Part of the plan was saved. Some cleanings still need a decision.",
  failed: "The plan could not be completed. Existing assignments were kept.",
  skipped: "Nothing in the schedule needed a new plan.",
};

export const PLANNING_STAGES = [
  ["synchronizing_calendars", "Checking the property calendars."],
  ["reconciling_reservations", "Matching reservations to cleaning tasks."],
  ["reviewing_assignments", "Reviewing the assignments already on the schedule."],
  ["coordinating_schedule", "Working out who can take each cleaning."],
  ["validating_plan", "Checking the plan against working hours and deadlines."],
  ["saving_changes", "Saving the assignments that should change."],
] as const;

export interface PlanningLine {
  tone: "default" | "muted" | "danger";
  text: string;
}

export interface PlanningChatMessage {
  id: string;
  from: "you" | "assistant";
  kind: "request" | "progress" | "success" | "warning" | "error";
  text: string;
}

export interface PlanningNames {
  propertyName?: (taskId: string | undefined) => string | undefined;
  cleanerName?: (cleanerId: string | undefined) => string | undefined;
}

export function clientSentence(value: string | null | undefined, fallback = "This needs your attention.") {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (REASON[text]) return REASON[text];
  if (/^[a-z0-9_]+$/.test(text)) return fallback;
  if (/traceback|exception|sqlalchemy|errno|https?:\/\//i.test(text)) return fallback;
  return text.replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, "this item");
}

export function planningLines(plan: PlanningRun, names: PlanningNames = {}): PlanningLine[] {
  const lines: PlanningLine[] = [{ tone: "default", text: openingLine(plan) }];
  const tally = countSentence(plan);
  if (tally) lines.push({ tone: "muted", text: tally });
  const summary = clientSentence(plan.reasoning_summary, "");
  if (summary) lines.push({ tone: "muted", text: summary });
  if (plan.error) lines.push({ tone: "danger", text: clientSentence(plan.error, "The plan could not be completed.") });

  const result = plan.result;
  for (const item of result?.assignments_to_create ?? []) {
    lines.push({ tone: "default", text: assignmentSentence("assigned", item, names) });
  }
  for (const item of result?.assignments_to_change ?? []) {
    lines.push({ tone: "default", text: assignmentSentence("changed", item, names) });
  }
  for (const item of result?.unassigned_tasks ?? []) {
    const place = propertyLabel(item.property_name, item.task_id, names);
    const why = clientSentence(item.explanation, REASON[item.reason_code] ?? "This cleaning is still unassigned.");
    const next = clientSentence(item.next_action, "");
    lines.push({ tone: "danger", text: joinSentences(`${place} is still unassigned.`, why, next) });
  }
  for (const item of result?.conflicts ?? plan.conflicts) {
    const place = propertyLabel(item.property_name, item.task_id ?? undefined, names);
    const why = clientSentence(item.explanation, REASON[item.code ?? ""] ?? "This cleaning needs a decision.");
    lines.push({ tone: "danger", text: place === "This cleaning" ? why : `${place}: ${why}` });
  }
  for (const failure of result?.sync_failures ?? []) {
    const place = failure.property_name || "A property";
    lines.push({
      tone: "danger",
      text: `${place}: the calendar could not be read. ${clientSentence(failure.error, "Check the address and try again.")}`,
    });
  }
  for (const warning of result?.warnings ?? plan.warnings ?? []) {
    const text = clientSentence(warning, "");
    if (text) lines.push({ tone: "muted", text });
  }
  for (const delivery of result?.notification_deliveries ?? []) {
    lines.push({ tone: "muted", text: deliverySentence(delivery) });
  }
  return dedupe(lines);
}

function openingLine(plan: PlanningRun) {
  if (plan.status === "completed" && plan.assignments_created === 0 && plan.assignments_changed === 0) {
    return plan.unassigned_count
      ? "No new assignments were saved. Some cleanings are still unassigned."
      : "No changes were needed. Existing assignments were kept.";
  }
  return RUN_STATUS[plan.status] ?? "The plan finished.";
}

function assignmentSentence(kind: "assigned" | "changed", item: { task_id: string; cleaner_id?: string; cleaner_name?: string | null; property_name?: string | null; explanation: string }, names: PlanningNames) {
  const place = propertyLabel(item.property_name, item.task_id, names);
  const cleaner = item.cleaner_name || names.cleanerName?.(item.cleaner_id) || "A cleaner";
  const why = clientSentence(item.explanation, "");
  const action = kind === "assigned" ? `${cleaner} was assigned to ${place}.` : `${cleaner}'s assignment at ${place} was updated.`;
  return why ? `${action} ${why}` : action;
}

function propertyLabel(embedded: string | null | undefined, taskId: string | undefined, names: PlanningNames) {
  return embedded || names.propertyName?.(taskId) || "This cleaning";
}

function deliverySentence(item: { status: string; property_name?: string | null }) {
  const place = item.property_name;
  if (item.status === "sent" || item.status === "delivered") return place ? `An email was sent about ${place}.` : "An email was sent.";
  if (item.status === "pending") return place ? `An email about ${place} is waiting to be sent.` : "An email is waiting to be sent.";
  if (item.status === "not_configured") {
    return place
      ? `Email is not set up, so the dashboard alert for ${place} was saved without sending mail.`
      : "Email is not set up, so the dashboard alert was saved without sending mail.";
  }
  if (item.status === "simulated") return place ? `A practice message was recorded for ${place}.` : "A practice message was recorded.";
  return place ? `The email about ${place} could not be sent.` : "The email could not be sent.";
}

function countSentence(plan: PlanningRun) {
  const parts = [
    counted(plan.tasks_considered, "cleaning was reviewed", "cleanings were reviewed"),
    counted(plan.assignments_created, "new assignment was saved", "new assignments were saved"),
    counted(plan.assignments_preserved, "existing assignment was kept", "existing assignments were kept"),
    counted(plan.assignments_changed, "assignment was changed", "assignments were changed"),
    counted(plan.unassigned_count, "cleaning is still unassigned", "cleanings are still unassigned"),
  ].filter(Boolean);
  return parts.join(" ");
}

function counted(count: number, singular: string, plural: string) {
  if (!count) return "";
  return `${count} ${count === 1 ? singular : plural}.`;
}

function joinSentences(...parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(" ");
}

function dedupe(lines: PlanningLine[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (seen.has(line.text)) return false;
    seen.add(line.text);
    return true;
  });
}
