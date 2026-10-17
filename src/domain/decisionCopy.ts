const EXACT: Record<string, string> = {
  "No feasible cleaner can take this turnover": "I checked the available cleaners, but I couldn't confirm a suitable assignment.",
  "Assignment retry limit reached": "I stopped after the assignment limit, so this cleaning needs your decision.",
  "Cleaning is in progress and can no longer be finished in the updated window": "Cleaning has already started, and there is no longer enough time to finish it.",
  "The assigned cleaner is no longer available": "The assigned cleaner can no longer take this job.",
  "The reservation changed while cleaning was in progress": "The reservation changed while cleaning was in progress, so the current plan no longer fits.",
  "The turnover was removed by a reservation change": "The reservation changed, so this cleaning was removed from the schedule.",
};

export function plainBrief(summary: string) {
  if (EXACT[summary]) return EXACT[summary];
  const lowered = summary.toLowerCase();
  if (lowered.includes("reservation")) return "The reservation changed, so the previous cleaning arrangement is no longer valid.";
  if (lowered.includes("declin")) return "A cleaner declined this job, so it needs a new assignment.";
  if (lowered.includes("cannot take this job")) return "The assigned cleaner can no longer take this job.";
  if (lowered.includes("in progress")) return "Cleaning has already started, and the current time no longer fits.";
  return "This cleaning needs a new plan.";
}

export function needsDecision(task: { status: string; hostResolved?: boolean }) {
  if (task.hostResolved) return false;
  return task.status === "at_risk" || task.status === "unassigned" || task.status === "blocked";
}

export function situationSentence(summary: string | undefined, declined: boolean) {
  const lowered = summary?.toLowerCase() ?? "";
  if (lowered.includes("reservation")) return "The reservation changed, so the previous cleaning arrangement is no longer valid.";
  if (declined || lowered.includes("declin")) return "A cleaner declined this job, so it needs a new assignment.";
  if (lowered.includes("in progress")) return "Cleaning has already started, and there is no longer enough time to finish it.";
  if (lowered.includes("assignment limit")) return "I stopped after the assignment limit, so this cleaning needs your decision.";
  return "This cleaning needs a new plan.";
}
