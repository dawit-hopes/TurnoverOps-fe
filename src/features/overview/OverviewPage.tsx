import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDay, formatTime, todayKey, zonedDateKey, addDaysKey, formatDayKey } from "../../domain/format";
import { clientSentence, PLANNING_STAGE_DONE, PLANNING_STAGE_IDS, PLANNING_STAGE_NOW, planningLines } from "../../domain/planningCopy";
import type { PlanningRun } from "../../domain/types";
import { fetchCurrentPlanningRun, fetchPlanningRun, startPlanningRun } from "../../services/apiOperations";
import { useOps } from "../../state/OperationsContext";
import { ConfirmationText, StatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Drawer";

export function OverviewPage() {
  const navigate = useNavigate();
  const { workspace, attention, openTask, openConflict, refreshWorkspace } = useOps();
  if (!workspace) return null;
  const timeZone = workspace.settings.timeZone;
  const today = todayKey(timeZone);
  const todayTasks = workspace.tasks.filter((task) => zonedDateKey(task.windowStart, timeZone) === today && !removedFromSchedule(task));
  const removedToday = workspace.tasks.filter((task) => zonedDateKey(task.windowStart, timeZone) === today && removedFromSchedule(task));
  const metrics = [
    { label: "Active properties", value: workspace.properties.filter((property) => property.calendarState === "connected").length },
    { label: "Cleaning tasks today", value: todayTasks.length },
    { label: "Tasks needing attention", value: workspace.tasks.filter((task) => !task.hostResolved && (task.status === "blocked" || task.status === "at_risk" || task.status === "unassigned")).length },
    { label: "Awaiting cleaner confirmation", value: workspace.tasks.filter((task) => task.confirmation === "pending").length },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-white md:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border-b border-line px-4 py-3 md:border-b-0 md:border-r md:last:border-r-0">
            <p className="text-xs text-muted">{metric.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm text-muted">
            <Check size={16} className="text-success" /> All caught up. No unresolved operational issues.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {attention.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                <AlertTriangle size={16} className={item.severity === "urgent" ? "mt-0.5 shrink-0 text-danger" : "mt-0.5 shrink-0 text-warning"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.explanation}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (item.conflictId) openConflict(item.conflictId);
                    else if (item.taskId) openTask(item.taskId);
                    else if (item.propertyId) navigate(`/properties?focus=${item.propertyId}`);
                  }}
                >
                  {item.actionLabel}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlanningPanel onFinished={refreshWorkspace} />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Today's cleaning schedule</h2>
        {removedToday.length > 0 ? (
          <ul className="mb-3 space-y-1 text-sm text-muted">
            {removedToday.map((task) => (
              <li key={task.id}>
                {workspace.properties.find((property) => property.id === task.propertyId)?.name ?? "A property"} is no longer on today's schedule because the reservation changed, so it was not assigned.
              </li>
            ))}
          </ul>
        ) : null}
        {todayTasks.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-6 text-sm text-muted">No cleaning tasks today.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Property</th>
                  <th className="px-4 py-2 font-medium">Cleaner</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {todayTasks.map((task) => (
                  <tr key={task.id} className="cursor-pointer border-b border-line last:border-b-0 hover:bg-zinc-50" onClick={() => openTask(task.id)}>
                    <td className="px-4 py-3">{formatTime(task.windowStart, timeZone)}–{formatTime(task.windowEnd, timeZone)}</td>
                    <td className="px-4 py-3">{workspace.properties.find((property) => property.id === task.propertyId)?.name}</td>
                    <td className="px-4 py-3">{workspace.cleaners.find((cleaner) => cleaner.id === task.cleanerId)?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3"><ConfirmationText value={task.confirmation} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {todayTasks.map((task) => (
                <li key={task.id}>
                  <button type="button" className="w-full px-4 py-3 text-left" onClick={() => openTask(task.id)}>
                    <span className="block text-sm font-medium">{workspace.properties.find((property) => property.id === task.propertyId)?.name}</span>
                    <span className="mt-1 block text-xs text-muted">{formatTime(task.windowStart, timeZone)}–{formatTime(task.windowEnd, timeZone)} · {workspace.cleaners.find((cleaner) => cleaner.id === task.cleanerId)?.name ?? "Unassigned"}</span>
                    <span className="mt-2 block"><StatusBadge status={task.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <WeekStrip />
    </div>
  );
}

function PlanningPanel({ onFinished }: { onFinished: () => Promise<void> }) {
  const { workspace } = useOps();
  const timeZone = workspace?.settings.timeZone ?? "UTC";
  const logRef = useRef<HTMLDivElement>(null);
  const seenStage = useRef(0);
  const [run, setRun] = useState<PlanningRun | null>(null);
  const [lastSuccessful, setLastSuccessful] = useState<PlanningRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [stageCount, setStageCount] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stop = false;
    void fetchCurrentPlanningRun()
      .then((current) => {
        if (stop) return;
        setRun(current.run);
        setLastSuccessful(current.last_successful);
        if (current.run?.status === "running") {
          setStarted(true);
          setOpen(true);
          setStageCount(stageIndex(current.run.stage) + 1);
        }
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [stageCount, error, run, busy, open]);

  useEffect(() => {
    if (!open || busy || run?.status !== "running") return;
    const timer = window.setInterval(() => {
      void fetchPlanningRun(run.id).then((next) => {
        const count = stageIndex(next.stage) + 1;
        if (count > seenStage.current) {
          seenStage.current = count;
          setStageCount(count);
        }
        setRun(next);
        if (next.status === "completed" || next.status === "partial") setLastSuccessful(next);
        if (next.status !== "running") void onFinished();
      }).catch(() => undefined);
    }, 700);
    return () => window.clearInterval(timer);
  }, [open, busy, run?.id, run?.status, onFinished]);

  const active = busy || run?.status === "running";
  const names = {
    propertyName: (taskId: string | undefined) => {
      const task = workspace?.tasks.find((item) => item.id === taskId);
      return workspace?.properties.find((property) => property.id === task?.propertyId)?.name;
    },
    cleanerName: (cleanerId: string | undefined) => workspace?.cleaners.find((cleaner) => cleaner.id === cleanerId)?.name,
  };
  const outcome = !active && started && run && run.status !== "running" ? planningLines(run, names) : [];
  const outcomeKind = outcomeKindFor(run, error);

  async function generate() {
    setBusy(true);
    setStarted(true);
    setOpen(true);
    setError("");
    setRun(null);
    setStageCount(1);
    seenStage.current = 1;
    const posted = startPlanningRun();
    const poll = window.setInterval(() => {
      void fetchCurrentPlanningRun()
        .then((current) => {
          if (current.run?.status !== "running") return;
          const count = stageIndex(current.run.stage) + 1;
          if (count > seenStage.current) {
            seenStage.current = count;
            setStageCount(count);
          }
          setRun(current.run);
        })
        .catch(() => undefined);
    }, 400);
    try {
      let next = await posted;
      window.clearInterval(poll);
      const target = Math.max(stageIndex(next.stage) + 1, 1);
      for (let count = seenStage.current; count < target; count += 1) {
        seenStage.current = count + 1;
        setStageCount(count + 1);
        await wait(280);
      }
      while (next.status === "running") {
        await wait(700);
        next = await fetchPlanningRun(next.id);
        const count = stageIndex(next.stage) + 1;
        if (count > seenStage.current) {
          seenStage.current = count;
          setStageCount(count);
        }
      }
      setRun(next);
      if (next.status === "completed" || next.status === "partial") setLastSuccessful(next);
      await onFinished();
    } catch (reason) {
      window.clearInterval(poll);
      setRun(null);
      setError(clientSentence(reason instanceof Error ? reason.message : "", "Today's plan could not be generated."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Today's assignments</h2>
          <p className="mt-1 text-sm text-muted">
            {lastSuccessful
              ? `Last successful plan ${formatDay(lastSuccessful.finished_at || lastSuccessful.started_at, timeZone)}.`
              : "No successful plan yet."}
          </p>
        </div>
        <Button onClick={() => void generate()} disabled={active}>
          {active ? "Generating…" : "Generate Today's Assignments"}
        </Button>
      </div>
      {open ? (
        <Dialog title="Today's assignments" onClose={() => setOpen(false)} closable={!active}>
          <div ref={logRef} className="flex h-[28rem] max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-lg bg-zinc-50 p-3" aria-live="polite">
            <ChatBubble from="you">Generate today's assignments.</ChatBubble>
            {PLANNING_STAGE_IDS.slice(0, stageCount).map((id, index) => {
              const last = index === stageCount - 1;
              const current = active && last;
              const incomplete = !active && (Boolean(error) || run?.status === "failed") && last;
              return (
                <ChatBubble key={id} from="assistant" kind={incomplete ? "error" : current ? "progress" : "done"}>
                  {current || incomplete ? PLANNING_STAGE_NOW[id] : PLANNING_STAGE_DONE[id]}
                </ChatBubble>
              );
            })}
            {error ? <ChatBubble from="assistant" kind="error">{error}</ChatBubble> : null}
            {outcome.length > 0 ? (
              <ChatBubble from="assistant" kind={outcomeKind}>
                {outcome.map((line) => (
                  <p key={line.text}>{line.text}</p>
                ))}
              </ChatBubble>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}

function stageIndex(stage: string | null | undefined) {
  const index = PLANNING_STAGE_IDS.findIndex((id) => id === stage);
  return index < 0 ? 0 : index;
}

function outcomeKindFor(run: PlanningRun | null, error: string): "success" | "warning" | "error" {
  if (error || run?.status === "failed") return "error";
  if (run?.status === "partial" || (run?.unassigned_count ?? 0) > 0 || (run?.conflicts.length ?? 0) > 0) return "warning";
  return "success";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ChatBubble({ from, kind = "done", children }: { from: "you" | "assistant"; kind?: "progress" | "done" | "success" | "warning" | "error"; children: ReactNode }) {
  const mine = from === "you";
  const tone =
    kind === "error"
      ? "border-danger bg-danger-soft text-danger"
      : kind === "success"
        ? "border-success bg-success-soft text-ink"
        : kind === "warning"
          ? "border-warning bg-warning-soft text-ink"
          : kind === "progress"
            ? "border-accent bg-white text-ink"
            : "border-line bg-white text-ink";
  return (
    <div className={mine ? "ml-10 flex justify-end" : "mr-10"}>
      <div className={`max-w-xl rounded-lg border px-3 py-2 text-sm ${mine ? "border-accent bg-accent text-white" : tone}`}>
        <p className={`mb-1 text-[11px] font-medium ${mine ? "text-white/80" : "text-muted"}`}>{mine ? "You" : "TurnoverOps"}</p>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}

function removedFromSchedule(task: { status: string; brief?: string; note?: string }) {
  if (task.status !== "blocked") return false;
  const text = `${task.brief ?? ""} ${task.note ?? ""}`.toLowerCase();
  return text.includes("removed") || text.includes("reservation changed");
}

function WeekStrip() {
  const { workspace, openTask } = useOps();
  const days = useMemo(() => {
    if (!workspace) return [];
    const today = todayKey(workspace.settings.timeZone);
    return Array.from({ length: 7 }, (_, index) => addDaysKey(today, index));
  }, [workspace]);
  if (!workspace) return null;
  const timeZone = workspace.settings.timeZone;

  return (
    <section>
      <h2 className="text-sm font-semibold">Upcoming turnovers</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const tasks = workspace.tasks.filter((task) => zonedDateKey(task.windowStart, timeZone) === day);
          const checkouts = workspace.reservations.filter((reservation) => zonedDateKey(reservation.checkoutAt, timeZone) === day);
          const checkins = workspace.reservations.filter((reservation) => zonedDateKey(reservation.checkInAt, timeZone) === day);
          return (
            <article key={day} className="rounded-lg border border-line bg-white p-3">
              <h3 className="text-xs font-medium">{formatDayKey(day, timeZone)}{day === days[0] ? " · Today" : ""}</h3>
              {tasks.length + checkouts.length === 0 ? <p className="mt-3 text-xs text-muted">No turnovers</p> : null}
              <ul className="mt-2 space-y-2">
                {checkouts.map((reservation) => (
                  <li key={`${reservation.id}-out`} className="text-xs">
                    <span className="font-medium">Checkout</span>
                    <span className="mt-0.5 block text-muted">{formatTime(reservation.checkoutAt, timeZone)} · {workspace.properties.find((property) => property.id === reservation.propertyId)?.name}</span>
                  </li>
                ))}
                {tasks.map((task) => (
                  <li key={task.id}>
                    <button type="button" className="text-left text-xs" onClick={() => openTask(task.id)}>
                      <span className="font-medium">Cleaning</span> <StatusBadge status={task.status} />
                      <span className="mt-0.5 block text-muted">{formatTime(task.windowStart, timeZone)}–{formatTime(task.windowEnd, timeZone)} · {workspace.properties.find((property) => property.id === task.propertyId)?.name}</span>
                    </button>
                  </li>
                ))}
                {checkins.map((reservation) => (
                  <li key={`${reservation.id}-in`} className="text-xs">
                    <span className="font-medium">Check-in</span>
                    <span className="mt-0.5 block text-muted">{formatTime(reservation.checkInAt, timeZone)} · {workspace.properties.find((property) => property.id === reservation.propertyId)?.name}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

