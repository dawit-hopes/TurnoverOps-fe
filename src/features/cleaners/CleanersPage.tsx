import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Drawer";
import { Field, SelectInput, TextInput } from "../../components/ui/Field";
import { WeekdayPicker } from "../../components/ui/WeekdayPicker";
import { formatClock, formatDay, timeOptions, WEEKDAY_LABEL, zonedDateKey } from "../../domain/format";
import type { Cleaner, Weekday } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

export function CleanersPage() {
  const { workspace, addCleaner, updateCleaner, removeCleaner, openTask } = useOps();
  const [editing, setEditing] = useState<Cleaner | "new" | null>(null);
  if (!workspace) return null;
  const timeZone = workspace.settings.timeZone;
  const today = zonedDateKey(new Date().toISOString(), timeZone);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted">Cleaners receive assignment emails at the address stored here. They only need to reply if they cannot take a job.</p>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setEditing("new")}>Add cleaner</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspace.cleaners.map((cleaner) => {
          const jobsToday = workspace.tasks.filter((task) => task.cleanerId === cleaner.id && zonedDateKey(task.windowStart, timeZone) === today && task.status !== "blocked").length;
          const upcoming = workspace.tasks.filter((task) => task.cleanerId === cleaner.id && task.status !== "completed").slice(0, 4);
          const responses = workspace.activity.filter((item) => item.cleanerId === cleaner.id && (item.type === "confirmation" || item.type === "decline")).slice(-3).reverse();
          return (
            <article key={cleaner.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{cleaner.name}</h2>
                  <p className="mt-1 text-sm text-muted">{cleaner.email || "No email address"}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Preferred properties</dt>
                  <dd>{cleaner.preferredPropertyIds.map((id) => workspace.properties.find((property) => property.id === id)?.name).filter(Boolean).join(", ") || "None"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Working hours</dt>
                  <dd>{cleaner.workingDays.map((day) => WEEKDAY_LABEL[day]).join(", ")} · {formatClock(cleaner.startTime)}–{formatClock(cleaner.endTime)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Workload</dt>
                  <dd>{jobsToday} today{cleaner.maxJobsPerDay ? ` · limit ${cleaner.maxJobsPerDay}` : ""}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Google Calendar</dt>
                  <dd>{cleaner.calendarState === "connected" ? "Connected" : cleaner.calendarState === "access_error" ? "Access error · unavailable for scheduling" : "Not connected · external availability unverified"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => setEditing(cleaner)}>Edit cleaner</Button>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Assignments and recent responses</summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {upcoming.length === 0 ? <li className="text-muted">No open assignments.</li> : upcoming.map((task) => (
                    <li key={task.id}>
                      <button type="button" className="text-left text-accent" onClick={() => openTask(task.id)}>
                        {formatDay(task.windowStart, timeZone)} · {workspace.properties.find((property) => property.id === task.propertyId)?.name}
                      </button>
                    </li>
                  ))}
                  {responses.map((item) => (
                    <li key={item.id} className="text-muted">{item.title}</li>
                  ))}
                </ul>
              </details>
              <button type="button" className="mt-4 text-xs text-danger" onClick={() => removeCleaner(cleaner.id)}>Remove cleaner</button>
            </article>
          );
        })}
      </div>
      {editing ? (
        <CleanerDialog
          cleaner={editing === "new" ? null : editing}
          properties={workspace.properties}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            void (editing === "new" ? addCleaner(input) : updateCleaner(editing.id, input)).then((saved) => {
              if (saved) setEditing(null);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function CleanerDialog({
  cleaner,
  properties,
  onClose,
  onSave,
}: {
  cleaner: Cleaner | null;
  properties: { id: string; name: string }[];
  onClose: () => void;
  onSave: (input: {
    name: string;
    email: string;
    workingDays: Weekday[];
    startTime: string;
    endTime: string;
    preferredPropertyIds: string[];
    maxJobsPerDay?: number;
  }) => void;
}) {
  const [name, setName] = useState(cleaner?.name ?? "");
  const [email, setEmail] = useState(cleaner?.email ?? "");
  const [workingDays, setWorkingDays] = useState<Weekday[]>(cleaner?.workingDays ?? ["mon", "tue", "wed", "thu", "fri", "sat"]);
  const [startTime, setStartTime] = useState(cleaner?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(cleaner?.endTime ?? "17:00");
  const [preferred, setPreferred] = useState<string[]>(cleaner?.preferredPropertyIds ?? []);
  const [maxJobs, setMaxJobs] = useState(cleaner?.maxJobsPerDay?.toString() ?? "");
  const [error, setError] = useState("");

  return (
    <Dialog title={cleaner ? "Edit cleaner" : "Add cleaner"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || workingDays.length === 0 || startTime >= endTime) {
            setError("Add a name, a valid email, at least one working day, and valid hours.");
            return;
          }
          onSave({
            name,
            email: email.trim(),
            workingDays,
            startTime,
            endTime,
            preferredPropertyIds: preferred,
            maxJobsPerDay: maxJobs ? Number(maxJobs) : undefined,
          });
        }}
      >
        <Field label="Name" htmlFor="cleaner-name"><TextInput id="cleaner-name" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Email" htmlFor="cleaner-email"><TextInput id="cleaner-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <div>
          <p className="mb-1 text-sm font-medium">Working days and hours</p>
          <WeekdayPicker value={workingDays} onChange={setWorkingDays} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><SelectInput aria-label="Start" value={startTime} onChange={(event) => setStartTime(event.target.value)}>{timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}</SelectInput></Field>
          <Field label="End"><SelectInput aria-label="End" value={endTime} onChange={(event) => setEndTime(event.target.value)}>{timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}</SelectInput></Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Preferred properties</p>
          <div className="flex flex-wrap gap-2">
            {properties.map((property) => {
              const selected = preferred.includes(property.id);
              return (
                <button key={property.id} type="button" aria-pressed={selected} className={`rounded-md border px-2 py-1 text-xs ${selected ? "border-accent bg-accent-soft text-accent" : "border-line"}`} onClick={() => setPreferred((current) => selected ? current.filter((id) => id !== property.id) : [...current, property.id])}>
                  {property.name}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Maximum jobs per day" htmlFor="cleaner-max" hint="Optional.">
          <TextInput id="cleaner-max" type="number" min={1} value={maxJobs} onChange={(event) => setMaxJobs(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button className="w-full sm:w-auto" type="submit">Save cleaner</Button>
        </div>
      </form>
    </Dialog>
  );
}
