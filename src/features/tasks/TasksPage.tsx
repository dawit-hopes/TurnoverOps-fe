import { useMemo, useState } from "react";
import { StatusBadge } from "../../components/ui/Badge";
import { SelectInput, TextInput } from "../../components/ui/Field";
import { addDaysKey, formatDayKey, formatTime, todayKey, zonedDateKey } from "../../domain/format";
import type { CleaningTask, TaskStatus, Workspace } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

const urgencyRank: Record<TaskStatus, number> = {
  blocked: 0,
  at_risk: 1,
  unassigned: 2,
  awaiting_confirmation: 3,
  in_progress: 4,
  confirmed: 5,
  completed: 6,
};

export function TasksPage() {
  const { workspace, openTask } = useOps();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [sort, setSort] = useState<"deadline" | "urgency">("deadline");

  const tasks = useMemo(() => {
    if (!workspace) return [];
    return workspace.tasks.filter((task) => matches(task, workspace, { query, from, to, propertyId, cleanerId, status: "" }));
  }, [workspace, query, from, to, propertyId, cleanerId]);

  if (!workspace) return null;
  const timeZone = workspace.settings.timeZone;
  const today = todayKey(timeZone);
  const groups = groupByDay(tasks, timeZone, sort);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search property or cleaner" aria-label="Search tasks" />
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" className="rounded-md border border-line bg-white px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" className="rounded-md border border-line bg-white px-3 py-2 text-sm" />
        <SelectInput aria-label="Property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
          <option value="">All properties</option>
          {workspace.properties.map((property) => (
            <option key={property.id} value={property.id}>{property.name}</option>
          ))}
        </SelectInput>
        <SelectInput aria-label="Cleaner" value={cleanerId} onChange={(event) => setCleanerId(event.target.value)}>
          <option value="">All cleaners</option>
          <option value="unassigned">Unassigned</option>
          {workspace.cleaners.map((cleaner) => (
            <option key={cleaner.id} value={cleaner.id}>{cleaner.name}</option>
          ))}
        </SelectInput>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</p>
        <SelectInput aria-label="Sort" className="w-auto" value={sort} onChange={(event) => setSort(event.target.value as "deadline" | "urgency")}>
          <option value="deadline">Earliest deadline</option>
          <option value="urgency">Needs attention first</option>
        </SelectInput>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">No tasks match these filters.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{dayHeading(group.day, today, timeZone)}</h2>
                <p className="text-xs text-muted">{group.tasks.length}</p>
              </div>
              <ul className="overflow-hidden rounded-lg border border-line bg-white">
                {group.tasks.map((task) => {
                  const property = workspace.properties.find((item) => item.id === task.propertyId);
                  const cleaner = workspace.cleaners.find((item) => item.id === task.cleanerId);
                  return (
                    <li key={task.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openTask(task.id)}
                        className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-zinc-50 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:px-4"
                      >
                        <span className="text-sm font-medium tabular-nums">
                          {formatTime(task.windowStart, timeZone)}
                          <span className="mt-0.5 block text-xs font-normal text-muted">{formatTime(task.windowEnd, timeZone)}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{property?.name ?? "Property"}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">{cleaner?.name ?? "Unassigned"}</span>
                        </span>
                        <StatusBadge status={task.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function matches(
  task: CleaningTask,
  workspace: Workspace,
  filters: { query: string; from: string; to: string; propertyId: string; cleanerId: string; status: string },
) {
  const timeZone = workspace.settings.timeZone;
  const property = workspace.properties.find((item) => item.id === task.propertyId);
  const cleaner = workspace.cleaners.find((item) => item.id === task.cleanerId);
  const haystack = `${property?.name ?? ""} ${cleaner?.name ?? ""}`.toLowerCase();
  if (filters.query && !haystack.includes(filters.query.toLowerCase())) return false;
  const day = zonedDateKey(task.windowStart, timeZone);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;
  if (filters.propertyId && task.propertyId !== filters.propertyId) return false;
  if (filters.cleanerId === "unassigned" && task.cleanerId) return false;
  if (filters.cleanerId && filters.cleanerId !== "unassigned" && task.cleanerId !== filters.cleanerId) return false;
  if (filters.status && task.status !== filters.status) return false;
  return true;
}

function groupByDay(tasks: CleaningTask[], timeZone: string, sort: "deadline" | "urgency") {
  const byDay = new Map<string, CleaningTask[]>();
  for (const task of tasks) {
    const day = zonedDateKey(task.windowStart, timeZone);
    const list = byDay.get(day);
    if (list) list.push(task);
    else byDay.set(day, [task]);
  }
  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, dayTasks]) => ({
      day,
      tasks: [...dayTasks].sort((a, b) =>
        sort === "urgency"
          ? urgencyRank[a.status] - urgencyRank[b.status] || a.windowStart.localeCompare(b.windowStart)
          : a.windowStart.localeCompare(b.windowStart),
      ),
    }));
}

function dayHeading(day: string, today: string, timeZone: string) {
  const label = formatDayKey(day, timeZone);
  if (day === today) return `Today · ${label}`;
  if (day === addDaysKey(today, 1)) return `Tomorrow · ${label}`;
  return label;
}
