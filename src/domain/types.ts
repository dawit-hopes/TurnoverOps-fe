export type TaskStatus =
  | "unassigned"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "at_risk"
  | "blocked";

export type ConfirmationState = "none" | "pending" | "accepted" | "declined" | "timed_out";

export type CalendarConnectionState = "not_connected" | "syncing" | "connected" | "failed";

export type TelegramConnectionState = "not_connected" | "invitation_pending" | "connected";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ActivityType =
  | "reservation_change"
  | "task_created"
  | "task_updated"
  | "auto_assignment"
  | "auto_reassignment"
  | "confirmation"
  | "decline"
  | "notification"
  | "sync"
  | "host_override"
  | "escalation";

export type ActivityOutcome = "succeeded" | "failed" | "pending" | "escalated";

export type ActivitySource = "sample" | "simulated" | "host";

export type AttentionKind =
  | "no_cleaner"
  | "declined_no_replacement"
  | "deadline_risk"
  | "calendar_failed"
  | "unconfirmed_urgent";

export interface HostProfile {
  name: string;
  email: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  icalUrl: string;
  checkoutTime: string;
  checkInTime: string;
  cleaningDurationMinutes: number;
  calendarState: CalendarConnectionState;
  calendarError?: string;
  lastSyncedAt?: string;
  lastAttemptAt?: string;
  syncFailureCount: number;
}

export interface Cleaner {
  id: string;
  name: string;
  email: string;
  telegramUsername?: string;
  workingDays: Weekday[];
  startTime: string;
  endTime: string;
  preferredPropertyIds: string[];
  maxJobsPerDay?: number;
  telegramState: TelegramConnectionState;
  invitationToken?: string;
  unavailableDates: string[];
}

export interface Reservation {
  id: string;
  propertyId: string;
  reference: string;
  guestName: string;
  checkoutAt: string;
  checkInAt: string;
}

export interface AssignmentEvent {
  id: string;
  at: string;
  kind:
    | "assigned"
    | "conflict_detected"
    | "reassigned"
    | "notification_sent"
    | "notification_skipped"
    | "accepted"
    | "declined"
    | "timeout"
    | "recovery_started"
    | "escalated"
    | "host_override"
    | "window_changed"
    | "marked_resolved";
  cleanerId?: string;
  summary: string;
  reason?: string;
}

export interface TelegramMessage {
  id: string;
  at: string;
  direction: "outbound" | "inbound";
  cleanerId: string;
  body: string;
  simulated: boolean;
  delivered: boolean;
}

export interface CandidateExclusion {
  cleanerId: string;
  reason: string;
}

export interface TaskAutomation {
  reassignment: "none" | "completed" | "not_possible";
  notification: "not_sent" | "simulated" | "sent";
  response: "none" | "awaiting" | "accepted" | "declined" | "timed_out";
  recovery: "none" | "in_progress" | "escalated";
}

export interface CleaningTask {
  id: string;
  propertyId: string;
  reservationId?: string;
  windowStart: string;
  windowEnd: string;
  deadline: string;
  durationMinutes: number;
  status: TaskStatus;
  cleanerId?: string;
  confirmation: ConfirmationState;
  automation: TaskAutomation;
  declinedCleanerIds: string[];
  assignmentHistory: AssignmentEvent[];
  messages: TelegramMessage[];
  note?: string;
  brief?: string;
  feedWindowStart?: string;
  feedWindowEnd?: string;
  managerNotified?: boolean;
  emailStatus?: string | null;
  assignmentEmailStatus?: string | null;
  assignmentEmailVia?: string | null;
  assignmentEmailError?: string | null;
  rejectionCleanerName?: string | null;
  replacementFound?: boolean | null;
  replacementCleanerName?: string | null;
  hostResolved?: boolean;
  assignmentId?: string;
}

export interface ConflictRecord {
  id: string;
  taskId: string;
  status: "resolved" | "unresolved";
  detectedAt: string;
  summary: string;
  detail: string;
  brief?: string;
  originalCleanerId?: string;
  selectedCleanerId?: string;
  selectionReason?: string;
  notification: "not_sent" | "simulated" | "sent";
  confirmation: "none" | "pending" | "accepted" | "declined";
  exclusions: CandidateExclusion[];
  recoveryAttempts: string[];
  timeline: AssignmentEvent[];
  hostResolved?: boolean;
}

export interface ActivityEvent {
  id: string;
  at: string;
  type: ActivityType;
  outcome: ActivityOutcome;
  title: string;
  reason: string;
  detail?: string;
  propertyId?: string;
  cleanerId?: string;
  taskId?: string;
  source: ActivitySource;
}

export interface AttentionItem {
  id: string;
  severity: "warning" | "urgent";
  kind: AttentionKind;
  title: string;
  explanation: string;
  actionLabel: string;
  taskId?: string;
  propertyId?: string;
  conflictId?: string;
}

export type DispatchMode = "review_only" | "automatic";

export interface Settings {
  timeZone: string;
  defaultCheckoutTime: string;
  defaultCheckInTime: string;
  defaultCleaningDurationMinutes: number;
  autoReassignment: boolean;
  trustedCleanerPolicy: boolean;
  notifyHostOnEscalation: boolean;
  notifyCleaners: boolean;
  syncIntervalMinutes: number;
  dispatchMode: DispatchMode;
  dailyPlanTime: string;
  dailyPlanningEnabled: boolean;
  allowFastPath: boolean;
  configurationConfirmedAt: string | null;
  planApprovedAt: string | null;
  telegramBotConnected: boolean;
  googleCalendarConnected: boolean;
}

export interface PlanningProposal {
  task_id: string;
  cleaner_id?: string;
  cleaner_name?: string | null;
  property_name?: string | null;
  explanation: string;
}

export interface PlanningRun {
  id: string;
  status: string;
  stage: string | null;
  trigger: string;
  operational_date: string;
  tasks_considered: number;
  assignments_created: number;
  assignments_preserved: number;
  assignments_changed: number;
  unassigned_count: number;
  conflicts: Array<{ code?: string; task_id?: string | null; explanation?: string; property_name?: string | null }>;
  warnings: string[];
  reasoning_summary: string | null;
  llm_skipped_reason: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  result: {
    assignments_to_create?: PlanningProposal[];
    assignments_to_change?: PlanningProposal[];
    assignments_to_preserve?: PlanningProposal[];
    unassigned_tasks?: Array<{ task_id: string; reason_code: string; explanation: string; next_action: string; property_name?: string | null }>;
    conflicts?: Array<{ code?: string; explanation?: string; task_id?: string | null; property_name?: string | null }>;
    sync_failures?: Array<{ property_id: string; property_name?: string; error: string }>;
    notification_deliveries?: Array<{ task_id: string | null; channel: string; status: string; property_name?: string | null }>;
    warnings?: string[];
    conflict_free?: boolean;
    reasoning_summary?: string | null;
  } | null;
}

export interface PropertyInput {
  name: string;
  address?: string;
  icalUrl: string;
  checkoutTime: string;
  checkInTime: string;
  cleaningDurationMinutes: number;
}

export interface CleanerInput {
  name: string;
  email: string;
  telegramUsername?: string;
  workingDays: Weekday[];
  startTime: string;
  endTime: string;
  preferredPropertyIds: string[];
  maxJobsPerDay?: number;
}

export interface WindowInput {
  date: string;
  endDate?: string;
  checkoutTime: string;
  checkInTime: string;
  cleaningStart: string;
  cleaningEnd: string;
}

export interface Workspace {
  host: HostProfile;
  properties: Property[];
  cleaners: Cleaner[];
  reservations: Reservation[];
  tasks: CleaningTask[];
  conflicts: ConflictRecord[];
  activity: ActivityEvent[];
  settings: Settings;
}

export interface PersistedState {
  host: HostProfile | null;
  workspace: Workspace | null;
}

export interface ActionResult {
  workspace: Workspace;
  message: string;
  ok: boolean;
  openTaskId?: string;
  openConflictId?: string;
}

export const DEMO_HOST: HostProfile = {
  name: "Marta Bekele",
  email: "marta.bekele@gmail.com",
};

export const DEFAULT_SETTINGS: Settings = {
  timeZone: "Africa/Addis_Ababa",
  defaultCheckoutTime: "10:00",
  defaultCheckInTime: "15:00",
  defaultCleaningDurationMinutes: 120,
  autoReassignment: true,
  trustedCleanerPolicy: false,
  notifyHostOnEscalation: true,
  notifyCleaners: true,
  syncIntervalMinutes: 5,
  dispatchMode: "review_only",
  dailyPlanTime: "06:00",
  dailyPlanningEnabled: false,
  allowFastPath: true,
  configurationConfirmedAt: null,
  planApprovedAt: null,
  telegramBotConnected: false,
  googleCalendarConnected: false,
};

export function emptyAutomation(): TaskAutomation {
  return {
    reassignment: "none",
    notification: "not_sent",
    response: "none",
    recovery: "none",
  };
}
