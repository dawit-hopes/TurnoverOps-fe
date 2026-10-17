import { cn } from "../../domain/format";
import { CALENDAR_LABEL, CONFIRMATION_LABEL, OUTCOME_LABEL, TASK_STATUS_LABEL, TELEGRAM_LABEL } from "../../domain/labels";
import type { ActivityOutcome, CalendarConnectionState, ConfirmationState, TaskStatus, TelegramConnectionState } from "../../domain/types";

const taskClass: Record<TaskStatus, string> = {
  unassigned: "bg-zinc-100 text-zinc-700",
  awaiting_confirmation: "bg-warning-soft text-warning",
  confirmed: "bg-accent-soft text-accent",
  in_progress: "bg-accent-soft text-accent",
  completed: "bg-success-soft text-success",
  at_risk: "bg-warning-soft text-warning",
  blocked: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", taskClass[status])}>
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: ActivityOutcome }) {
  const className =
    outcome === "succeeded"
      ? "bg-success-soft text-success"
      : outcome === "pending"
        ? "bg-warning-soft text-warning"
        : outcome === "escalated"
          ? "bg-danger-soft text-danger"
          : "bg-danger-soft text-danger";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>{OUTCOME_LABEL[outcome]}</span>;
}

export function CalendarBadge({ state }: { state: CalendarConnectionState }) {
  const className =
    state === "connected"
      ? "bg-success-soft text-success"
      : state === "failed"
        ? "bg-danger-soft text-danger"
        : state === "syncing"
          ? "bg-accent-soft text-accent"
          : "bg-zinc-100 text-zinc-700";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>{CALENDAR_LABEL[state]}</span>;
}

export function TelegramBadge({ state }: { state: TelegramConnectionState }) {
  const className =
    state === "connected"
      ? "bg-success-soft text-success"
      : state === "invitation_pending"
        ? "bg-warning-soft text-warning"
        : "bg-zinc-100 text-zinc-700";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>{TELEGRAM_LABEL[state]}</span>;
}

export function ConfirmationText({ value }: { value: ConfirmationState }) {
  return <span className="text-sm text-ink">{CONFIRMATION_LABEL[value]}</span>;
}
