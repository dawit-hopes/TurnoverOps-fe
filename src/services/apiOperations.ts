import { demoFeed } from "../data/demoFeed";
import type { CleanerInput, DispatchMode, PlanningRun, PropertyInput, WindowInput } from "../domain/types";
import { parseTimeToMinutes, zonedIso } from "../domain/format";
import { fetchAll, request } from "./http";
import { mapWorkspace, weekdaysToApi, type ApiBundle, type ApiIntegrations, type HostMe } from "./mapWorkspace";

interface SyncResult {
  ok: boolean;
  error: string | null;
}

export interface ScheduleCandidate {
  cleaner_id: string;
  cleaner_name: string;
  feasible: boolean;
  reasons: string[];
  summary: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  jobs_that_day?: number;
  preferred?: boolean;
  slack_minutes?: number;
}

export interface ManagerAlert {
  manager_notified: boolean;
  email_status: string | null;
}

export interface ScheduleDecision {
  candidates: ScheduleCandidate[];
  managerAlert: ManagerAlert | null;
}

export async function fetchMe() {
  return request<HostMe>("/auth/me");
}

export async function signInWithIdToken(idToken: string) {
  return request<{ access_token: string; host: HostMe }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export async function loadWorkspace(host: { name: string; email: string }, inviteUrls: Record<string, string>, syncingIds: string[]) {
  const [properties, cleaners, reservations, tasks, activity, notifications, settings, integrations] = await Promise.all([
    fetchAll<ApiBundle["properties"][number]>("/properties?active=true"),
    fetchAll<ApiBundle["cleaners"][number]>("/cleaners?active=true"),
    fetchAll<ApiBundle["reservations"][number]>("/reservations"),
    fetchAll<ApiBundle["tasks"][number]>("/tasks"),
    fetchAll<ApiBundle["activity"][number]>("/activity"),
    fetchAll<ApiBundle["notifications"][number]>("/notifications"),
    request<ApiBundle["settings"]>("/settings"),
    request<ApiIntegrations>("/integrations"),
  ]);
  return mapWorkspace({
    properties,
    cleaners,
    reservations,
    tasks,
    activity,
    notifications,
    settings,
    integrations,
    inviteUrls,
    syncingIds,
    host,
  });
}

function timeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export async function createProperty(input: PropertyInput, timeZone: string) {
  const created = await request<{ id: string }>("/properties", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      timezone: timeZone,
      default_checkout_time: timeValue(input.checkoutTime),
      default_checkin_time: timeValue(input.checkInTime),
      cleaning_duration_minutes: input.cleaningDurationMinutes,
      feed_kind: input.icalUrl.trim() ? "ical" : "none",
      ical_url: input.icalUrl.trim() || null,
    }),
  });
  if (input.icalUrl.trim()) await syncProperty(created.id);
}

export async function updateProperty(propertyId: string, input: PropertyInput, replaceUrl: boolean) {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    default_checkout_time: timeValue(input.checkoutTime),
    default_checkin_time: timeValue(input.checkInTime),
    cleaning_duration_minutes: input.cleaningDurationMinutes,
  };
  if (replaceUrl) {
    body.feed_kind = input.icalUrl.trim() ? "ical" : "none";
    body.ical_url = input.icalUrl.trim() || null;
  }
  await request(`/properties/${propertyId}`, { method: "PATCH", body: JSON.stringify(body) });
  if (replaceUrl && input.icalUrl.trim()) await syncProperty(propertyId);
}

export async function syncProperty(propertyId: string, reservations?: unknown) {
  const result = await request<SyncResult>(`/properties/${propertyId}/sync`, {
    method: "POST",
    body: JSON.stringify(reservations ? { reservations } : {}),
  });
  if (!result.ok) throw new Error(result.error || "Calendar sync failed");
  return result;
}

export async function deactivateProperty(propertyId: string) {
  await request(`/properties/${propertyId}/deactivate`, { method: "POST" });
}

export async function createCleaner(input: CleanerInput, timeZone: string) {
  await request("/cleaners", {
    method: "POST",
    body: JSON.stringify(cleanerBody(input, timeZone)),
  });
}

export async function updateCleaner(cleanerId: string, input: CleanerInput, timeZone: string) {
  await request(`/cleaners/${cleanerId}`, {
    method: "PATCH",
    body: JSON.stringify(cleanerBody(input, timeZone)),
  });
}

function cleanerBody(input: CleanerInput, timeZone: string) {
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    telegram_username: input.telegramUsername?.replace(/^@/, "").trim() || null,
    timezone: timeZone,
    working_days: weekdaysToApi(input.workingDays),
    work_start: timeValue(input.startTime),
    work_end: timeValue(input.endTime),
    max_jobs_per_day: input.maxJobsPerDay ?? null,
    preferred_property_ids: input.preferredPropertyIds,
    property_ids: [],
  };
}

export async function deactivateCleaner(cleanerId: string) {
  await request(`/cleaners/${cleanerId}/deactivate`, { method: "POST" });
}

export async function createInvite(cleanerId: string) {
  return request<{ invite_url: string; expires_at: string }>(`/cleaners/${cleanerId}/invites`, { method: "POST" });
}

export async function revokeInvites(cleanerId: string) {
  await request(`/cleaners/${cleanerId}/invites/revoke`, { method: "POST" });
}

export async function saveSettings(settings: {
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
}) {
  await request("/settings", {
    method: "PUT",
    body: JSON.stringify({
      timezone: settings.timeZone,
      default_checkout_time: timeValue(settings.defaultCheckoutTime),
      default_checkin_time: timeValue(settings.defaultCheckInTime),
      default_cleaning_duration_minutes: settings.defaultCleaningDurationMinutes,
      auto_reassignment: settings.autoReassignment,
      trusted_cleaner_policy: settings.trustedCleanerPolicy,
      notify_host_on_escalation: settings.notifyHostOnEscalation,
      notify_cleaners: settings.notifyCleaners,
      sync_interval_minutes: settings.syncIntervalMinutes,
      dispatch_mode: settings.dispatchMode,
      daily_plan_time: timeValue(settings.dailyPlanTime),
      daily_planning_enabled: settings.dailyPlanningEnabled,
      allow_fast_path: settings.allowFastPath,
    }),
  });
}

export async function startPlanningRun() {
  return request<PlanningRun>("/planning/runs", { method: "POST" });
}

export async function fetchPlanningRun(runId: string) {
  return request<PlanningRun>(`/planning/runs/${runId}`);
}

export async function fetchCurrentPlanningRun() {
  return request<{ run: PlanningRun | null; last_successful: PlanningRun | null }>("/planning/runs/current");
}

export async function confirmConfiguration() {
  return request<PlanningRun>("/onboarding/confirm-configuration", { method: "POST" });
}

export async function approvePlan(dispatchMode: DispatchMode) {
  return request("/onboarding/approve-plan", {
    method: "POST",
    body: JSON.stringify({ dispatch_mode: dispatchMode }),
  });
}

export async function completeOnboarding(properties: Array<PropertyInput & { id: string }>, cleaners: Array<CleanerInput & { id: string }>, timeZone: string) {
  const propertyIds = new Map<string, string>();
  for (const property of properties) {
    const created = await request<{ id: string }>("/properties", {
      method: "POST",
      body: JSON.stringify({
        name: property.name.trim(),
        timezone: timeZone,
        default_checkout_time: timeValue(property.checkoutTime),
        default_checkin_time: timeValue(property.checkInTime),
        cleaning_duration_minutes: property.cleaningDurationMinutes,
        feed_kind: property.icalUrl.trim() ? "ical" : "none",
        ical_url: property.icalUrl.trim() || null,
      }),
    });
    propertyIds.set(property.id, created.id);
  }
  for (const cleaner of cleaners) {
    await createCleaner(
      {
        ...cleaner,
        preferredPropertyIds: cleaner.preferredPropertyIds.flatMap((id) => {
          const mapped = propertyIds.get(id);
          return mapped ? [mapped] : [];
        }),
      },
      timeZone,
    );
  }
  await request("/onboarding/complete", { method: "POST" });
  for (const property of properties) {
    const propertyId = propertyIds.get(property.id);
    if (!property.icalUrl.trim() || !propertyId) continue;
    try {
      await syncProperty(propertyId);
    } catch {
      // The property keeps the feed error so the host can retry it.
    }
  }
}

export function windowPatch(input: WindowInput, timeZone: string) {
  if (input.checkoutTime >= input.checkInTime || input.cleaningStart >= input.cleaningEnd) {
    throw new Error("The end time has to be later than the start time.");
  }
  if (input.cleaningStart < input.checkoutTime || input.cleaningEnd > input.checkInTime) {
    throw new Error("The cleaning window has to sit between checkout and check-in.");
  }
  const duration = parseTimeToMinutes(input.cleaningEnd) - parseTimeToMinutes(input.cleaningStart);
  if (duration < 30) throw new Error("Give the cleaning window at least 30 minutes.");
  return {
    window_start: zonedIso(input.date, input.checkoutTime, timeZone),
    window_end: zonedIso(input.date, input.checkInTime, timeZone),
    duration_minutes: duration,
  };
}

export async function patchTaskWindow(taskId: string, input: WindowInput, timeZone: string) {
  await request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(windowPatch(input, timeZone)),
  });
}

export async function patchExactWindow(taskId: string, startIso: string, endIso: string, durationMinutes: number) {
  await request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      window_start: startIso,
      window_end: endIso,
      duration_minutes: durationMinutes,
    }),
  });
}

export async function previewWindow(propertyId: string, startIso: string, endIso: string, durationMinutes: number) {
  const decision = await request<{ candidates: ScheduleCandidate[] }>("/scheduling/preview", {
    method: "POST",
    body: JSON.stringify({
      property_id: propertyId,
      window_start: startIso,
      window_end: endIso,
      duration_minutes: durationMinutes,
    }),
  });
  return decision.candidates;
}

export async function assignTask(taskId: string, cleanerId: string) {
  await request(`/tasks/${taskId}/assignments`, {
    method: "POST",
    body: JSON.stringify({ cleaner_id: cleanerId }),
  });
}

export async function retryTask(taskId: string) {
  await request(`/tasks/${taskId}/retry`, { method: "POST" });
}

export async function retryAssignmentEmail(taskId: string) {
  await request(`/tasks/${taskId}/assignment-email/retry`, { method: "POST" });
}

export async function resolveTask(taskId: string) {
  await request(`/tasks/${taskId}/resolve`, { method: "POST" });
}

export async function evaluateTask(taskId: string): Promise<ScheduleDecision> {
  const decision = await request<{ candidates: ScheduleCandidate[]; manager_alert: ManagerAlert | null }>("/scheduling/evaluate", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId }),
  });
  return { candidates: decision.candidates, managerAlert: decision.manager_alert };
}

export async function connectCalendar() {
  const result = await request<{ authorization_url: string }>("/integrations/google-calendar/connect", { method: "POST" });
  window.location.assign(result.authorization_url);
}

export async function finishCalendarConnect(code: string, state: string) {
  await request("/integrations/google-calendar/callback", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
}

export async function importSample(propertyId: string | null, timeZone: string) {
  let target = propertyId;
  if (!target) {
    const created = await request<{ id: string }>("/properties", {
      method: "POST",
      body: JSON.stringify({ name: "Sample property", timezone: timeZone, feed_kind: "none" }),
    });
    target = created.id;
  }
  await syncProperty(target, demoFeed.reservations);
}
