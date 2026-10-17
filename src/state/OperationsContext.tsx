import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { deriveAttention } from "../domain/attention";
import type { AttentionItem, Cleaner, CleanerInput, DispatchMode, HostProfile, PlanningRun, Property, PropertyInput, Settings, WindowInput, Workspace } from "../domain/types";
import {
  assignTask,
  approvePlan as postApprovePlan,
  completeOnboarding,
  confirmConfiguration,
  connectCalendar,
  createCleaner,
  createInvite,
  createProperty,
  deactivateCleaner,
  deactivateProperty,
  evaluateTask,
  fetchMe,
  loadWorkspace,
  patchExactWindow,
  patchTaskWindow,
  resolveTask,
  retryAssignmentEmail,
  retryTask,
  revokeInvites,
  saveSettings as putSettings,
  signInWithIdToken,
  syncProperty,
  updateCleaner,
  updateProperty,
  type ScheduleDecision,
} from "../services/apiOperations";
import { ApiError, authToken, clearAuthToken, request, setAuthToken } from "../services/http";

interface OperationsContextValue {
  ready: boolean;
  host: HostProfile | null;
  onboardingComplete: boolean;
  planApproved: boolean;
  workspace: Workspace | null;
  attention: AttentionItem[];
  notice: string | null;
  dismissNotice: () => void;
  selectedTaskId: string | null;
  selectedConflictId: string | null;
  openTask: (id: string) => void;
  openConflict: (id: string) => void;
  closePanels: () => void;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => void;
  finishOnboarding: (properties: Property[], cleaners: Cleaner[]) => Promise<void>;
  confirmConfiguration: () => Promise<PlanningRun>;
  approvePlan: (dispatchMode: DispatchMode) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  retrySync: (propertyId: string) => Promise<void>;
  addProperty: (input: PropertyInput) => Promise<boolean>;
  updateProperty: (propertyId: string, input: PropertyInput, replaceUrl: boolean) => Promise<boolean>;
  removeProperty: (propertyId: string) => void;
  addCleaner: (input: CleanerInput) => Promise<boolean>;
  updateCleaner: (cleanerId: string, input: CleanerInput) => Promise<boolean>;
  removeCleaner: (cleanerId: string) => void;
  generateInvitation: (cleanerId: string) => void;
  revokeInvitation: (cleanerId: string) => void;
  saveSettings: (settings: Settings) => void;
  changeWindow: (taskId: string, input: WindowInput) => Promise<string | null>;
  saveCleaningWindow: (taskId: string, startIso: string, endIso: string, durationMinutes: number) => Promise<string | null>;
  assignCleaner: (taskId: string, cleanerId: string, override: boolean) => Promise<string | null>;
  markResolved: (conflictId: string) => void;
  retryAssignment: (taskId: string) => void;
  retryCleanerEmail: (taskId: string) => Promise<string | null>;
  evaluateTask: (taskId: string) => Promise<ScheduleDecision>;
  connectGoogleCalendar: () => Promise<void>;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

function message(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed";
}

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const openTask = useCallback((id: string) => {
    setSelectedConflictId(null);
    setSelectedTaskId(id);
  }, []);
  const hostRef = useRef<HostProfile | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  const invitesRef = useRef<Record<string, string>>({});
  const syncingRef = useRef<string[]>([]);

  const applyHost = (next: HostProfile | null, complete: boolean) => {
    hostRef.current = next;
    setHost(next);
    setOnboardingComplete(complete);
  };

  const applyWorkspace = (next: Workspace | null) => {
    workspaceRef.current = next;
    setWorkspace(next);
  };

  const reload = async (profile = hostRef.current) => {
    if (!profile) return null;
    const next = await loadWorkspace(profile, invitesRef.current, syncingRef.current);
    applyWorkspace(next);
    return next;
  };

  const refreshWorkspace = useCallback(async () => {
    const profile = hostRef.current;
    if (!profile) return;
    const next = await loadWorkspace(profile, invitesRef.current, syncingRef.current);
    workspaceRef.current = next;
    setWorkspace(next);
  }, []);

  useEffect(() => {
    if (!authToken()) {
      setReady(true);
      return;
    }
    void fetchMe()
      .then(async (me) => {
        const profile = { name: me.name, email: me.email };
        const complete = me.onboarding_completed_at != null;
        applyHost(profile, complete);
        if (complete) await reload(profile);
      })
      .catch(() => {
        clearAuthToken();
        applyHost(null, false);
        applyWorkspace(null);
      })
      .finally(() => setReady(true));
  }, []);

  const run = async (work: () => Promise<void>, success?: string) => {
    try {
      await work();
      await reload();
      if (success) setNotice(success);
      return null;
    } catch (error) {
      await reload().catch(() => undefined);
      const text = message(error);
      setNotice(text);
      return text;
    }
  };

  const ok = (work: () => Promise<void>, success?: string) => run(work, success).then((error) => error === null);
  const timeZone = () => workspaceRef.current?.settings.timeZone ?? "Africa/Addis_Ababa";

  const attention = workspace ? deriveAttention(workspace) : [];

  const value: OperationsContextValue = {
    ready,
    host,
    onboardingComplete,
    planApproved: Boolean(workspace?.settings.planApprovedAt),
    workspace,
    attention,
    notice,
    dismissNotice: () => setNotice(null),
    selectedTaskId,
    selectedConflictId,
    openTask,
    openConflict: (id) => {
      setSelectedTaskId(null);
      setSelectedConflictId(id);
    },
    closePanels: () => {
      setSelectedTaskId(null);
      setSelectedConflictId(null);
    },
    signInWithGoogle: async (idToken) => {
      const result = await signInWithIdToken(idToken);
      setAuthToken(result.access_token);
      const profile = { name: result.host.name, email: result.host.email };
      const complete = result.host.onboarding_completed_at != null;
      applyHost(profile, complete);
      if (complete) await reload(profile);
      else applyWorkspace(null);
      setNotice(null);
    },
    signOut: () => {
      clearAuthToken();
      invitesRef.current = {};
      applyHost(null, false);
      applyWorkspace(null);
      setNotice(null);
      setSelectedTaskId(null);
      setSelectedConflictId(null);
    },
    finishOnboarding: async (properties, cleaners) => {
      const settings = await request<{ timezone: string }>("/settings");
      await completeOnboarding(properties, cleaners, settings.timezone);
      await reload();
      applyHost(hostRef.current, true);
    },
    confirmConfiguration: () => confirmConfiguration(),
    approvePlan: async (dispatchMode) => {
      await postApprovePlan(dispatchMode);
      await reload();
    },
    refreshWorkspace,
    retrySync: async (propertyId) => {
      syncingRef.current = [...syncingRef.current, propertyId];
      if (hostRef.current) await reload();
      try {
        await syncProperty(propertyId);
        setNotice("Calendar sync finished.");
      } catch (error) {
        setNotice(message(error));
      } finally {
        syncingRef.current = syncingRef.current.filter((id) => id !== propertyId);
        await reload();
      }
    },
    addProperty: (input) => ok(() => createProperty(input, timeZone()), "Property saved."),
    updateProperty: (propertyId, input, replaceUrl) => ok(() => updateProperty(propertyId, input, replaceUrl), "Property updated."),
    removeProperty: (propertyId) => {
      void run(() => deactivateProperty(propertyId), "Property removed.");
    },
    addCleaner: (input) => ok(() => createCleaner(input, timeZone()), "Cleaner saved."),
    updateCleaner: (cleanerId, input) => ok(() => updateCleaner(cleanerId, input, timeZone()), "Cleaner updated."),
    removeCleaner: (cleanerId) => {
      void run(() => deactivateCleaner(cleanerId), "Cleaner removed.");
    },
    generateInvitation: (cleanerId) => {
      void run(async () => {
        const invite = await createInvite(cleanerId);
        invitesRef.current = { ...invitesRef.current, [cleanerId]: invite.invite_url };
      }, "Invitation link created.");
    },
    revokeInvitation: (cleanerId) => {
      void run(async () => {
        await revokeInvites(cleanerId);
        const next = { ...invitesRef.current };
        delete next[cleanerId];
        invitesRef.current = next;
      }, "Invitation revoked.");
    },
    saveSettings: (settings) => {
      void run(() => putSettings(settings), "Settings saved.");
    },
    changeWindow: (taskId, input) => run(() => patchTaskWindow(taskId, input, timeZone())),
    saveCleaningWindow: (taskId, startIso, endIso, durationMinutes) => run(() => patchExactWindow(taskId, startIso, endIso, durationMinutes)),
    assignCleaner: (taskId, cleanerId, _override) => run(() => assignTask(taskId, cleanerId)),
    markResolved: (conflictId) => {
      const taskId = workspaceRef.current?.conflicts.find((item) => item.id === conflictId)?.taskId ?? conflictId;
      void run(() => resolveTask(taskId), "Issue marked resolved.");
    },
    retryAssignment: (taskId) => {
      void run(() => retryTask(taskId), "Assignment retried.");
    },
    retryCleanerEmail: (taskId) => run(() => retryAssignmentEmail(taskId), "Assignment email retried."),
    evaluateTask,
    connectGoogleCalendar: async () => {
      try {
        await connectCalendar();
      } catch (error) {
        setNotice(message(error));
      }
    },
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOps() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOps must be used within OperationsProvider");
  return context;
}
