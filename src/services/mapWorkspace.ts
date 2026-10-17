import type {
  ActivityEvent,
  ActivityOutcome,
  ActivityType,
  AssignmentEvent,
  CalendarConnectionState,
  Cleaner,
  CleaningTask,
  ConfirmationState,
  ConflictRecord,
  Property,
  Reservation,
  Settings,
  TaskAutomation,
  TelegramConnectionState,
  TelegramMessage,
  Weekday,
  Workspace,
} from "../domain/types";
import { plainBrief } from "../domain/decisionCopy";
import { WEEKDAYS } from "../domain/format";

export interface HostMe {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  onboarding_completed_at: string | null;
}

interface ApiProperty {
  id: string;
  name: string;
  timezone: string;
  default_checkout_time: string;
  default_checkin_time: string;
  cleaning_duration_minutes: number;
  feed_kind: string;
  ical_url: string | null;
  sync_status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

interface ApiCleaner {
  id: string;
  name: string;
  email: string | null;
  telegram_username: string | null;
  telegram_user_id: string | null;
  working_days: number[];
  work_start: string;
  work_end: string;
  preferred_property_ids: string[];
  max_jobs_per_day: number | null;
  telegram_status: string;
  calendar_status: "not_connected" | "connected" | "access_error";
  unavailable_dates: string[];
}

interface ApiReservation {
  id: string;
  property_id: string;
  external_uid: string;
  start_at: string;
  end_at: string;
  summary: string | null;
  guest_name: string | null;
}

interface ApiAssignment {
  id: string;
  cleaner_id: string;
  state: string;
  reason: string;
  attempt_number: number;
}

interface ApiTask {
  id: string;
  property_id: string;
  checkout_reservation_id: string | null;
  window_start: string;
  window_end: string;
  duration_minutes: number;
  feed_window_start?: string;
  feed_window_end?: string;
  manager_notified?: boolean;
  email_status?: string | null;
  assignment_email_status?: string | null;
  assignment_email_via?: string | null;
  assignment_email_error?: string | null;
  rejection_cleaner_name?: string | null;
  replacement_found?: boolean | null;
  replacement_cleaner_name?: string | null;
  status: CleaningTask["status"];
  assigned_cleaner_id: string | null;
  conflict_details: {
    summary?: string;
    brief?: string;
    selected_cleaner_id?: string;
    rejected?: Array<{ cleaner_id: string; reasons: string[] }>;
  } | null;
  host_resolved_at: string | null;
  assignment: ApiAssignment | null;
  updated_at: string;
}

interface ApiAudit {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ApiNotification {
  id: string;
  recipient_type: string;
  recipient_id: string;
  channel: string;
  body: string;
  status: string;
  task_id: string | null;
  created_at: string;
}

interface ApiSettings {
  timezone: string;
  default_checkout_time: string;
  default_checkin_time: string;
  default_cleaning_duration_minutes: number;
  auto_reassignment: boolean;
  trusted_cleaner_policy: boolean;
  notify_cleaners: boolean;
  notify_host_on_escalation: boolean;
  sync_interval_minutes: number;
  dispatch_mode?: "review_only" | "automatic";
  daily_plan_time?: string;
  daily_planning_enabled?: boolean;
  allow_fast_path?: boolean;
  configuration_confirmed_at?: string | null;
  plan_approved_at?: string | null;
}

export interface ApiIntegrations {
  telegram: { configured: boolean };
  google_calendar: { configured: boolean; connected: boolean };
}

export interface ApiBundle {
  properties: ApiProperty[];
  cleaners: ApiCleaner[];
  reservations: ApiReservation[];
  tasks: ApiTask[];
  activity: ApiAudit[];
  notifications: ApiNotification[];
  settings: ApiSettings;
  integrations: ApiIntegrations;
  inviteUrls: Record<string, string>;
  syncingIds: string[];
  host: { name: string; email: string };
}

const REASON_TEXT: Record<string, string> = {
  inactive: "Inactive",
  unavailable: "Unavailable that day",
  not_eligible: "Not assigned to this property",
  insufficient_window: "The window is shorter than the cleaning",
  outside_working_hours: "Outside working hours",
  overlap: "Overlaps another job",
  daily_job_limit: "Daily job limit reached",
};

function clock(value: string) {
  return value.slice(0, 5);
}

export function weekdaysFromApi(days: number[]): Weekday[] {
  return [...days].sort((left, right) => left - right).flatMap((day) => {
    const name = WEEKDAYS[day];
    return name ? [name] : [];
  });
}

export function weekdaysToApi(days: Weekday[]) {
  return days.map((day) => WEEKDAYS.indexOf(day)).filter((day) => day >= 0);
}

function calendarState(property: ApiProperty, syncingIds: string[]): CalendarConnectionState {
  if (syncingIds.includes(property.id)) return "syncing";
  if (property.sync_status === "error") return "failed";
  if ((property.feed_kind === "ical" || property.feed_kind === "demo") && property.sync_status === "ok") return "connected";
  return "not_connected";
}

function telegramState(cleaner: ApiCleaner, inviteUrl?: string): TelegramConnectionState {
  if (cleaner.telegram_status === "connected" || cleaner.telegram_user_id) return "connected";
  if (cleaner.telegram_status === "pending" || inviteUrl) return "invitation_pending";
  return "not_connected";
}

function confirmationOf(task: ApiTask): ConfirmationState {
  if (!task.assigned_cleaner_id || !task.assignment) return "none";
  if (task.assignment.state === "awaiting_confirmation") return "pending";
  if (task.assignment.state === "accepted") return "accepted";
  if (task.assignment.state === "declined") return "declined";
  if (task.assignment.state === "expired") return "timed_out";
  return "none";
}

function taskIdOf(event: ApiAudit) {
  if (event.entity_type === "cleaning_task") return event.entity_id;
  const details = event.details;
  return typeof details?.task_id === "string" ? details.task_id : undefined;
}

function historyKind(eventType: string, attempt: unknown): AssignmentEvent["kind"] {
  if (eventType === "assignment_proposed") return typeof attempt === "number" && attempt > 1 ? "reassigned" : "assigned";
  if (eventType === "assignment_accepted") return "accepted";
  if (eventType === "assignment_declined") return "declined";
  if (eventType === "assignment_expired") return "timeout";
  if (eventType === "conflict_detected" || eventType === "candidate_rejected") return "conflict_detected";
  if (eventType === "host_intervention_required" || eventType === "recovery_exhausted") return "escalated";
  if (eventType === "issue_resolved") return "marked_resolved";
  if (eventType === "notification_sent") return "notification_sent";
  if (eventType === "notification_failed" || eventType === "notification_simulated") return "notification_skipped";
  if (eventType === "cleaning_task_updated") return "window_changed";
  if (eventType === "cleaner_unavailable" || eventType === "assignment_cancelled") return "host_override";
  return "assigned";
}

function activityType(eventType: string): ActivityType {
  if (eventType.startsWith("reservation")) return "reservation_change";
  if (eventType === "cleaning_task_generated") return "task_created";
  if (eventType === "cleaning_task_updated") return "task_updated";
  if (eventType === "assignment_proposed") return "auto_assignment";
  if (eventType === "assignment_accepted") return "confirmation";
  if (eventType === "assignment_declined" || eventType === "assignment_expired") return "decline";
  if (eventType.includes("notification")) return "notification";
  if (eventType.includes("sync") || eventType.startsWith("integration") || eventType.startsWith("invite") || eventType === "telegram_connected") return "sync";
  if (eventType === "issue_resolved" || eventType === "cleaner_unavailable") return "host_override";
  if (eventType === "host_intervention_required" || eventType === "recovery_exhausted" || eventType === "delay_reported") return "escalation";
  if (eventType === "conflict_detected") return "auto_reassignment";
  return "task_updated";
}

function activityOutcome(eventType: string): ActivityOutcome {
  if (eventType.includes("failed")) return "failed";
  if (eventType === "host_intervention_required" || eventType === "recovery_exhausted") return "escalated";
  if (eventType === "assignment_proposed") return "pending";
  return "succeeded";
}

function reasonText(reasons: string[]) {
  return reasons.map((reason) => REASON_TEXT[reason] ?? reason).join(". ");
}

function notificationState(notes: ApiNotification[]): TaskAutomation["notification"] {
  if (notes.some((note) => note.status === "sent")) return "sent";
  if (notes.some((note) => note.status === "simulated")) return "simulated";
  return "not_sent";
}

export function mapWorkspace(bundle: ApiBundle): Workspace {
  const syncing = new Set(bundle.syncingIds);
  const properties: Property[] = bundle.properties.map((property) => ({
    id: property.id,
    name: property.name,
    icalUrl: property.ical_url ?? "",
    checkoutTime: clock(property.default_checkout_time),
    checkInTime: clock(property.default_checkin_time),
    cleaningDurationMinutes: property.cleaning_duration_minutes,
    calendarState: calendarState(property, [...syncing]),
    calendarError: property.last_sync_error ?? undefined,
    lastSyncedAt: property.last_synced_at ?? undefined,
    lastAttemptAt: property.last_synced_at ?? undefined,
    syncFailureCount: property.sync_status === "error" ? 1 : 0,
  }));
  const cleaners: Cleaner[] = bundle.cleaners.map((cleaner) => ({
    id: cleaner.id,
    name: cleaner.name,
    email: cleaner.email ?? "",
    telegramUsername: cleaner.telegram_username ?? undefined,
    workingDays: weekdaysFromApi(cleaner.working_days),
    startTime: clock(cleaner.work_start),
    endTime: clock(cleaner.work_end),
    preferredPropertyIds: cleaner.preferred_property_ids,
    maxJobsPerDay: cleaner.max_jobs_per_day ?? undefined,
    telegramState: telegramState(cleaner, bundle.inviteUrls[cleaner.id]),
    calendarState: cleaner.calendar_status ?? "not_connected",
    invitationToken: bundle.inviteUrls[cleaner.id],
    unavailableDates: cleaner.unavailable_dates ?? [],
  }));
  const reservations: Reservation[] = bundle.reservations.map((reservation) => ({
    id: reservation.id,
    propertyId: reservation.property_id,
    reference: reservation.external_uid,
    guestName: reservation.guest_name || reservation.summary || "Guest",
    checkoutAt: reservation.end_at,
    checkInAt: reservation.start_at,
  }));
  const settings: Settings = {
    timeZone: bundle.settings.timezone,
    defaultCheckoutTime: clock(bundle.settings.default_checkout_time),
    defaultCheckInTime: clock(bundle.settings.default_checkin_time),
    defaultCleaningDurationMinutes: bundle.settings.default_cleaning_duration_minutes,
    autoReassignment: bundle.settings.auto_reassignment,
    trustedCleanerPolicy: bundle.settings.trusted_cleaner_policy,
    notifyHostOnEscalation: bundle.settings.notify_host_on_escalation,
    notifyCleaners: bundle.settings.notify_cleaners,
    syncIntervalMinutes: bundle.settings.sync_interval_minutes,
    dispatchMode: bundle.settings.dispatch_mode ?? "review_only",
    dailyPlanTime: clock(bundle.settings.daily_plan_time ?? "06:00:00"),
    dailyPlanningEnabled: bundle.settings.daily_planning_enabled ?? false,
    allowFastPath: bundle.settings.allow_fast_path ?? true,
    configurationConfirmedAt: bundle.settings.configuration_confirmed_at ?? null,
    planApprovedAt: bundle.settings.plan_approved_at ?? null,
    telegramBotConnected: bundle.integrations.telegram.configured,
    googleCalendarConnected: bundle.integrations.google_calendar.connected,
  };
  const propertyByTask = new Map(bundle.tasks.map((task) => [task.id, task.property_id]));
  const activity: ActivityEvent[] = bundle.activity.map((event) => {
    const taskId = taskIdOf(event);
    const cleanerId = typeof event.details?.cleaner_id === "string" ? event.details.cleaner_id : undefined;
    const propertyId = event.entity_type === "property" ? event.entity_id : taskId ? propertyByTask.get(taskId) : undefined;
    return {
      id: event.id,
      at: event.created_at,
      type: activityType(event.event_type),
      outcome: activityOutcome(event.event_type),
      title: event.reason,
      reason: event.reason,
      propertyId,
      cleanerId,
      taskId,
      source: event.event_type === "notification_simulated" ? "simulated" : "host",
    };
  });
  const tasks: CleaningTask[] = bundle.tasks.map((task) => {
    const confirmation = confirmationOf(task);
    const notes = bundle.notifications.filter((note) => note.task_id === task.id && note.recipient_type === "cleaner");
    const linked = bundle.activity.filter((event) => taskIdOf(event) === task.id);
    const declinedCleanerIds = linked.flatMap((event) => {
      if (event.event_type !== "assignment_declined") return [];
      const cleanerId = event.details?.cleaner_id;
      return typeof cleanerId === "string" ? [cleanerId] : [];
    });
    const assignmentHistory: AssignmentEvent[] = linked.map((event) => ({
      id: event.id,
      at: event.created_at,
      kind: historyKind(event.event_type, event.details?.attempt),
      cleanerId: typeof event.details?.cleaner_id === "string" ? event.details.cleaner_id : undefined,
      summary: event.reason,
      reason: event.reason,
    }));
    const messages: TelegramMessage[] = notes.map((note) => ({
      id: note.id,
      at: note.created_at,
      direction: "outbound",
      cleanerId: note.recipient_id,
      body: note.body,
      simulated: note.status === "simulated" || note.channel === "simulated",
      delivered: note.status === "sent",
    }));
    const problem = task.status === "at_risk" || task.status === "unassigned" || task.status === "blocked";
    const automation: TaskAutomation = {
      reassignment: task.assignment && task.assignment.attempt_number > 1 ? "completed" : problem ? "not_possible" : "none",
      notification: notificationState(notes),
      response: confirmation === "pending" ? "awaiting" : confirmation === "timed_out" ? "timed_out" : confirmation === "none" ? "none" : confirmation,
      recovery: problem ? "escalated" : "none",
    };
    return {
      id: task.id,
      propertyId: task.property_id,
      reservationId: task.checkout_reservation_id ?? undefined,
      windowStart: task.window_start,
      windowEnd: task.window_end,
      deadline: task.window_end,
      durationMinutes: task.duration_minutes,
      status: task.status,
      cleanerId: task.assigned_cleaner_id ?? undefined,
      confirmation,
      automation,
      declinedCleanerIds,
      assignmentHistory,
      messages,
      note: task.conflict_details?.summary,
      brief: task.conflict_details?.brief || (task.conflict_details?.summary ? plainBrief(task.conflict_details.summary) : undefined),
      feedWindowStart: task.feed_window_start,
      feedWindowEnd: task.feed_window_end,
      managerNotified: Boolean(task.manager_notified),
      emailStatus: task.email_status ?? null,
      assignmentEmailStatus: task.assignment_email_status ?? null,
      assignmentEmailVia: task.assignment_email_via ?? null,
      assignmentEmailError: task.assignment_email_error ?? null,
      rejectionCleanerName: task.rejection_cleaner_name ?? null,
      replacementFound: task.replacement_found ?? null,
      replacementCleanerName: task.replacement_cleaner_name ?? null,
      hostResolved: Boolean(task.host_resolved_at),
      assignmentId: task.assignment?.id,
    };
  });
  const conflicts: ConflictRecord[] = bundle.tasks.flatMap((task) => {
    const problem = task.status === "at_risk" || task.status === "unassigned" || task.status === "blocked";
    if (!problem && !task.host_resolved_at && !task.conflict_details) return [];
    const mapped = tasks.find((item) => item.id === task.id);
    const rejected = task.conflict_details?.rejected ?? [];
    const notes = bundle.notifications.filter((note) => note.task_id === task.id && note.recipient_type === "cleaner");
    const confirmation = confirmationOf(task);
    return [
      {
        id: task.id,
        taskId: task.id,
        status: task.host_resolved_at || !problem ? "resolved" : "unresolved",
        detectedAt: task.updated_at,
        summary: task.conflict_details?.summary || "Scheduling update",
        detail: task.conflict_details?.summary || "The server recorded a scheduling update for this task.",
        brief: task.conflict_details?.brief || (task.conflict_details?.summary ? plainBrief(task.conflict_details.summary) : undefined),
        originalCleanerId: rejected[0]?.cleaner_id,
        selectedCleanerId: task.conflict_details?.selected_cleaner_id || task.assigned_cleaner_id || undefined,
        selectionReason: task.assignment?.reason || task.conflict_details?.summary,
        notification: notificationState(notes),
        confirmation: confirmation === "pending" || confirmation === "accepted" || confirmation === "declined" ? confirmation : "none",
        exclusions: rejected.map((item) => ({ cleanerId: item.cleaner_id, reason: reasonText(item.reasons) })),
        recoveryAttempts: mapped?.assignmentHistory.filter((event) => event.kind === "reassigned" || event.kind === "escalated").map((event) => event.summary) ?? [],
        timeline: mapped?.assignmentHistory ?? [],
        hostResolved: Boolean(task.host_resolved_at),
      } satisfies ConflictRecord,
    ];
  });
  return {
    host: bundle.host,
    properties,
    cleaners,
    reservations,
    tasks,
    conflicts,
    activity,
    settings,
  };
}
