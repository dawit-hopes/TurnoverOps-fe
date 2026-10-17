import { useEffect, useState } from "react";
import { situationSentence } from "../../domain/decisionCopy";
import { addDaysKey, formatDay, formatDuration, formatTime, todayKey, zonedDateKey, zonedIso } from "../../domain/format";
import type { CleaningTask } from "../../domain/types";
import { previewWindow, type ManagerAlert, type ScheduleCandidate } from "../../services/apiOperations";
import { useOps } from "../../state/OperationsContext";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Drawer";
import { Field } from "../ui/Field";

type Candidate = ScheduleCandidate;

export function DecisionPanel({ taskId, onLater }: { taskId: string; onLater: () => void }) {
  const { workspace, evaluateTask, assignCleaner, saveCleaningWindow, retryCleanerEmail } = useOps();
  const task = workspace?.tasks.find((item) => item.id === taskId);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [alert, setAlert] = useState<ManagerAlert | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    setPhase("loading");
    setCandidates(null);
    void evaluateTask(task.id)
      .then((decision) => {
        if (cancelled) return;
        setCandidates(decision.candidates);
        setAlert(decision.managerAlert);
        setPhase("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [evaluateTask, task]);

  if (!workspace || !task) return null;
  const timeZone = workspace.settings.timeZone;
  const property = workspace.properties.find((item) => item.id === task.propertyId);
  const conflict = workspace.conflicts.find((item) => item.taskId === task.id);
  const feasible = (candidates ?? []).filter((candidate) => candidate.feasible);
  const settled = task.status === "confirmed" || task.status === "in_progress" || task.status === "completed";
  const declined = task.declinedCleanerIds.length > 0 || task.confirmation === "declined" || Boolean(conflict?.timeline.some((event) => event.kind === "declined"));
  const situation = situationSentence(conflict?.brief || task.brief || conflict?.detail || task.note, declined);
  const coverage = coverageSentence(phase, candidates, feasible.length);
  const status = statusLabel(phase, task, settled);
  const cleaner = workspace.cleaners.find((item) => item.id === task.cleanerId);
  const savedText = feedback?.tone === "ok" ? savedSentence(task, cleaner?.name) : feedback?.text;
  const email = emailLabel(alert?.email_status ?? task.emailStatus);
  const notified = Boolean(alert?.manager_notified || task.managerNotified);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">{property?.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-xl font-semibold tracking-tight">{settled ? "Cleaning is set" : "Cleaning needs a new plan"}</h3>
          <p className="text-sm text-muted">
            <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${status === "Resolved" ? "bg-success" : status === "Needs your decision" ? "bg-warning" : "bg-muted"}`} aria-hidden="true" />
            <span role="status">{status}</span>
          </p>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink">{situation}</p>
        {coverage ? <p className="max-w-xl text-sm leading-6 text-muted">{coverage}</p> : null}
        <p className={`text-sm ${deadlineUrgent(task.deadline) && !settled ? "text-warning" : "text-ink"}`}>
          <span className="text-muted">Cleaning deadline: </span>
          {deadlineLabel(task.deadline, timeZone)}
        </p>
        <AssignmentMailStatus task={task} retryCleanerEmail={retryCleanerEmail} cleanerEmail={cleaner?.email} />
      </header>

      {savedText ? <p className={`text-sm ${feedback?.tone === "error" ? "text-danger" : "text-ink"}`}>{savedText}</p> : null}

      {settled ? (
        <section className="max-w-xl space-y-2 border-t border-line pt-6">
          <h4 className="text-sm font-semibold">Recommended next step</h4>
          <p className="text-sm leading-6">
            {cleaner ? `${cleaner.name} is assigned` : "A cleaner is assigned"}
            {task.windowStart ? ` for ${formatTime(task.windowStart, timeZone)}–${formatTime(task.windowEnd, timeZone)}` : ""}. This cleaning is {task.status === "completed" ? "complete" : task.status === "in_progress" ? "underway" : "confirmed"}.
          </p>
        </section>
      ) : (
        <section className="max-w-xl space-y-4 border-t border-line pt-6">
          <h4 className="text-sm font-semibold">Recommended next step</h4>
          {phase === "error" ? (
            <div className="space-y-3">
              <p className="text-sm leading-6">I couldn't check who can take this cleaning. The task is unchanged.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setPhase("loading");
                  void evaluateTask(task.id)
                    .then((decision) => {
                      setCandidates(decision.candidates);
                      setAlert(decision.managerAlert);
                      setPhase("ready");
                    })
                    .catch(() => setPhase("error"));
                }}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {phase === "ready" && feasible.length > 0 ? (
            <ul className="space-y-3">
              {feasible.map((candidate, index) => (
                <li key={candidate.cleaner_id} className="rounded-md border border-line px-4 py-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{candidate.cleaner_name}</p>
                      <p className="text-sm text-muted">{optionWhen(candidate, timeZone)}</p>
                      <p className="text-sm">Meets the deadline</p>
                      <p className="text-sm text-muted">{optionReason(candidate)}</p>
                    </div>
                    <Button
                      variant={index === 0 ? "primary" : "secondary"}
                      className="w-full sm:w-auto"
                      disabled={Boolean(busyId)}
                      onClick={() => {
                        setBusyId(candidate.cleaner_id);
                        setFeedback(null);
                        void assignCleaner(task.id, candidate.cleaner_id, false).then((error) => {
                          setBusyId("");
                          setFeedback(error ? { tone: "error", text: assignmentError(error) } : { tone: "ok", text: "Saved." });
                        });
                      }}
                    >
                      {busyId === candidate.cleaner_id ? "Confirming…" : "Confirm assignment"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {phase === "ready" && feasible.length === 0 ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">Find alternative coverage</p>
                <p className="mt-1 text-sm leading-6 text-muted">{alternativeCopy(candidates?.length ?? 0)}</p>
              </div>
              {notified || email ? (
                <div className="space-y-1 text-sm">
                  {notified ? <p>Manager notified</p> : null}
                  {email ? <p>{email}</p> : null}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={() => setEditing(true)}>Adjust the schedule</Button>
                <Button className="w-full sm:w-auto" variant="ghost" onClick={onLater}>
                  Handle this later
                </Button>
              </div>
            </div>
          ) : null}
          {phase === "ready" && feasible.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setEditing(true)}>
                Adjust the schedule
              </Button>
              <Button className="w-full sm:w-auto" variant="ghost" onClick={onLater}>
                Handle this later
              </Button>
            </div>
          ) : null}
        </section>
      )}

      {editing ? (
        <ScheduleEditor
          task={task}
          timeZone={timeZone}
          onClose={() => setEditing(false)}
          onSave={async (startIso, endIso) => {
            const error = await saveCleaningWindow(task.id, startIso, endIso, task.durationMinutes);
            if (!error) setEditing(false);
            setFeedback(error ? { tone: "error", text: error } : { tone: "ok", text: "Saved." });
            return error;
          }}
        />
      ) : null}

      <details className="max-w-xl border-t border-line pt-4">
        <summary className="cursor-pointer text-sm text-muted">Technical details</summary>
        <div className="mt-3 space-y-3 text-sm text-muted">
          {conflict?.detail ? <p>{conflict.detail}</p> : <p>No diagnostic summary was stored for this task.</p>}
          {conflict && conflict.exclusions.length > 0 ? (
            <ul className="space-y-1">
              {conflict.exclusions.map((item) => (
                <li key={item.cleanerId}>
                  {workspace.cleaners.find((cleanerItem) => cleanerItem.id === item.cleanerId)?.name ?? "Cleaner"}: {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {conflict && conflict.timeline.length > 0 ? (
            <ol className="space-y-2">
              {conflict.timeline.map((event) => (
                <li key={event.id}>
                  {event.summary}
                  <span className="mt-0.5 block text-xs">{formatDay(event.at, timeZone)} {formatTime(event.at, timeZone)}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function ScheduleEditor({
  task,
  timeZone,
  onClose,
  onSave,
}: {
  task: CleaningTask;
  timeZone: string;
  onClose: () => void;
  onSave: (startIso: string, endIso: string) => Promise<string | null>;
}) {
  const gapStart = task.feedWindowStart || task.windowStart;
  const gapEnd = task.feedWindowEnd || task.windowEnd;
  const initialEnd = new Date(Math.min(new Date(task.windowStart).getTime() + task.durationMinutes * 60 * 1000, new Date(task.windowEnd).getTime())).toISOString();
  const [startDate, setStartDate] = useState(zonedDateKey(task.windowStart, timeZone));
  const [endDate, setEndDate] = useState(zonedDateKey(initialEnd, timeZone));
  const [startTime, setStartTime] = useState(clockValue(task.windowStart, timeZone));
  const [endTime, setEndTime] = useState(clockValue(initialEnd, timeZone));
  const [check, setCheck] = useState<"idle" | "checking" | "ready">("idle");
  const [preview, setPreview] = useState<Candidate[] | null>(null);
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const crosses = zonedDateKey(gapStart, timeZone) !== zonedDateKey(gapEnd, timeZone);
  const startIso = safeIso(startDate, startTime, timeZone);
  const endIso = safeIso(endDate, endTime, timeZone);
  const proposedMinutes = startIso && endIso ? Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000) : 0;
  const outside = Boolean(startIso && endIso && (new Date(startIso).getTime() < new Date(gapStart).getTime() - 1000 || new Date(endIso).getTime() > new Date(gapEnd).getTime() + 1000));
  const tooShort = proposedMinutes < task.durationMinutes;

  useEffect(() => {
    if (!startIso || !endIso || outside || tooShort || proposedMinutes < 30) {
      setCheck("idle");
      setPreview(null);
      return;
    }
    let cancelled = false;
    setCheck("checking");
    const timer = window.setTimeout(() => {
      void previewWindow(task.propertyId, startIso, endIso, task.durationMinutes)
        .then((next) => {
          if (cancelled) return;
          setPreview(next);
          setProblem("");
          setCheck("ready");
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setPreview(null);
          setProblem(error instanceof Error ? error.message : "The schedule could not be checked.");
          setCheck("idle");
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [endIso, outside, proposedMinutes, startIso, task.durationMinutes, task.propertyId, tooShort]);

  const feasible = (preview ?? []).filter((candidate) => candidate.feasible);
  const canSave = check === "ready" && feasible.length > 0 && !saving;

  return (
    <Dialog title="Adjust the cleaning window" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!startIso || !endIso || !canSave) return;
          setSaving(true);
          void onSave(startIso, endIso).finally(() => setSaving(false));
        }}
      >
        <p className="text-sm leading-6 text-muted">Checkout and check-in stay as booked. This only changes when the cleaning happens.</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Checkout</dt>
            <dd>{deadlineLabel(gapStart, timeZone)}</dd>
          </div>
          <div>
            <dt className="text-muted">Next check-in</dt>
            <dd>{deadlineLabel(gapEnd, timeZone)}</dd>
          </div>
          <div>
            <dt className="text-muted">Required cleaning</dt>
            <dd>{formatDuration(task.durationMinutes)}</dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2">
          {crosses ? (
            <Field label="Cleaning start date" htmlFor="clean-start-date">
              <input id="clean-start-date" type="date" value={startDate} min={zonedDateKey(gapStart, timeZone)} max={zonedDateKey(gapEnd, timeZone)} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" required />
            </Field>
          ) : null}
          <Field label="Cleaning start" htmlFor="clean-start">
            <input id="clean-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" required />
          </Field>
          {crosses ? (
            <Field label="Cleaning end date" htmlFor="clean-end-date">
              <input id="clean-end-date" type="date" value={endDate} min={startDate} max={zonedDateKey(gapEnd, timeZone)} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" required />
            </Field>
          ) : null}
          <Field label="Cleaning end" htmlFor="clean-end">
            <input id="clean-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm" required />
          </Field>
        </div>
        {outside ? <p className="text-sm text-warning">That time is outside the booking. Checkout and check-in stay as reserved.</p> : null}
        {tooShort && !outside ? <p className="text-sm text-warning">This window is shorter than the required {formatDuration(task.durationMinutes)}.</p> : null}
        {check === "checking" ? <p className="text-sm text-muted">Checking whether this window can be covered.</p> : null}
        {check === "ready" && feasible.length > 0 ? <p className="text-sm">{feasible[0].cleaner_name} can take this window, and it meets the deadline.</p> : null}
        {check === "ready" && feasible.length === 0 ? <p className="text-sm text-warning">No configured cleaner can take this window.</p> : null}
        {problem ? <p className="text-sm text-danger">{problem}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" type="submit" disabled={!canSave}>
            {saving ? "Saving…" : "Save cleaning window"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function coverageSentence(phase: "loading" | "ready" | "error", candidates: Candidate[] | null, feasibleCount: number) {
  if (phase !== "ready" || !candidates) return "";
  if (feasibleCount > 0) return feasibleCount === 1 ? "I found one cleaner who can take it." : `I found ${feasibleCount} cleaners who can take it.`;
  if (candidates.length === 0) return "No cleaners are set up, so I can't assign this cleaning.";
  return "I checked the available cleaners, but I couldn't confirm a suitable assignment.";
}

function alternativeCopy(count: number) {
  if (count === 0) return "Add a cleaner who can work this property, or adjust the cleaning window inside the booking.";
  if (count === 1) return "The configured cleaner cannot take this window. You can adjust the cleaning time inside the booking, or arrange coverage another way.";
  return "None of the configured cleaners can take this window. You can adjust the cleaning time inside the booking, or arrange coverage another way.";
}

function statusLabel(phase: "loading" | "ready" | "error", task: CleaningTask, settled: boolean) {
  if (settled || task.hostResolved) return "Resolved";
  if (phase === "loading") return "Looking for coverage";
  if (task.confirmation === "pending") return "Waiting for cleaner confirmation";
  return "Needs your decision";
}

function savedSentence(task: CleaningTask, name: string | undefined) {
  if (task.status === "confirmed" || task.status === "in_progress" || task.status === "completed") {
    return `${name ?? "The cleaner"} is assigned. This cleaning is ${task.status === "completed" ? "complete" : task.status === "in_progress" ? "underway" : "confirmed"}.`;
  }
  return "The change was saved. This cleaning still needs a decision.";
}

function assignmentError(message: string) {
  if (message.toLowerCase().includes("cannot take")) return "That cleaner cannot take this window, so the assignment was not changed.";
  return message;
}

export function AssignmentMailStatus({
  task,
  cleanerEmail,
  retryCleanerEmail,
}: {
  task: CleaningTask;
  cleanerEmail?: string;
  retryCleanerEmail: (taskId: string) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const status = assignmentEmailLabel(task);
  if (!cleanerEmail && !status && !task.rejectionCleanerName) return null;
  const failed = task.assignmentEmailStatus === "failed" || task.assignmentEmailStatus === "not_configured";
  return (
    <div className="space-y-2 text-sm">
      {cleanerEmail ? <p><span className="text-muted">Cleaner email: </span>{cleanerEmail}</p> : null}
      {status ? <p>{status}</p> : null}
      {failed && task.assignmentEmailError ? <p className="text-muted">{task.assignmentEmailError}</p> : null}
      {task.rejectionCleanerName ? (
        <p>
          {task.rejectionCleanerName} declined this job.
          {task.replacementFound ? ` ${task.replacementCleanerName ?? "A replacement"} is now assigned.` : " No replacement was found."}
        </p>
      ) : null}
      {failed ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void retryCleanerEmail(task.id).finally(() => setBusy(false));
          }}
        >
          {busy ? "Retrying…" : "Retry email"}
        </Button>
      ) : null}
    </div>
  );
}

function assignmentEmailLabel(task: CleaningTask) {
  if (task.assignmentEmailStatus === "sent" && task.assignmentEmailVia === "weekly") return "Included in the weekly schedule email";
  if (task.assignmentEmailStatus === "sent") return "Assignment email sent";
  if (task.assignmentEmailStatus === "pending") return "Assignment email is waiting to send";
  if (task.assignmentEmailStatus === "failed") return "Assignment email failed";
  if (task.assignmentEmailStatus === "not_configured") return "Assignment email is not configured";
  return "";
}

function emailLabel(status: string | null | undefined) {
  if (status === "sent" || status === "delivered") return "Email sent";
  if (status === "pending") return "Email delivery pending";
  if (status === "failed" || status === "not_configured") return "Email could not be sent";
  return "";
}

function optionWhen(candidate: Candidate, timeZone: string) {
  if (!candidate.scheduled_start || !candidate.scheduled_end) return "The start time is set when the assignment is saved.";
  return `${formatTime(candidate.scheduled_start, timeZone)}–${formatTime(candidate.scheduled_end, timeZone)}`;
}

function optionReason(candidate: Candidate) {
  const jobs = candidate.jobs_that_day ?? 0;
  const spare = candidate.slack_minutes ?? 0;
  const load = jobs === 0 ? "No other jobs that day" : jobs === 1 ? "One other job that day" : `${jobs} other jobs that day`;
  const room = spare <= 0 ? "finishes at the deadline" : spare < 60 ? `${spare} min before check-in` : `${Math.round(spare / 60)} hr before check-in`;
  return `${candidate.preferred ? "Preferred for this property. " : ""}${load}, and ${room}.`;
}

function deadlineLabel(iso: string, timeZone: string) {
  const day = zonedDateKey(iso, timeZone);
  const today = todayKey(timeZone);
  const when = day === today ? "Today" : day === addDaysKey(today, 1) ? "Tomorrow" : formatDay(iso, timeZone);
  return `${when}, ${formatTime(iso, timeZone)}`;
}

function deadlineUrgent(iso: string) {
  return new Date(iso).getTime() - Date.now() < 12 * 60 * 60 * 1000;
}

function clockValue(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function safeIso(date: string, time: string, timeZone: string) {
  if (!date || !time) return "";
  try {
    return zonedIso(date, time, timeZone);
  } catch {
    return "";
  }
}
