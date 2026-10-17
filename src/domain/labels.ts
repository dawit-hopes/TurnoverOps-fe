import type { ActivityType, TaskStatus } from "./types";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  unassigned: "Unassigned",
  awaiting_confirmation: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  at_risk: "At risk",
  blocked: "Blocked",
};

export const CONFIRMATION_LABEL = {
  none: "—",
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  timed_out: "Timed out",
} as const;

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  reservation_change: "Reservation change",
  task_created: "Task created",
  task_updated: "Task updated",
  auto_assignment: "Automatic assignment",
  auto_reassignment: "Automatic reassignment",
  confirmation: "Cleaner confirmation",
  decline: "Cleaner decline",
  notification: "Notification",
  sync: "Calendar sync",
  host_override: "Host override",
  escalation: "Escalation",
};

export const OUTCOME_LABEL = {
  succeeded: "Succeeded",
  failed: "Failed",
  pending: "Pending",
  escalated: "Escalated",
} as const;

export const CALENDAR_LABEL = {
  not_connected: "Not connected",
  syncing: "Syncing",
  connected: "Connected",
  failed: "Connection failed",
} as const;

export const TELEGRAM_LABEL = {
  not_connected: "Not connected",
  invitation_pending: "Invitation pending",
  connected: "Connected",
} as const;

export const DURATION_OPTIONS = [
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2.5 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];
