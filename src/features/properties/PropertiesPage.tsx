import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarBadge, StatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Drawer";
import { Field, SelectInput, TextInput } from "../../components/ui/Field";
import { formatClock, formatDateTime, formatDay, formatDuration, formatTime, maskIcalUrl, timeOptions } from "../../domain/format";
import { DURATION_OPTIONS } from "../../domain/labels";
import type { Property } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

export function PropertiesPage() {
  const { workspace, addProperty, updateProperty, removeProperty, retrySync, openTask } = useOps();
  const [params] = useSearchParams();
  const focus = params.get("focus");
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  const [removing, setRemoving] = useState<Property | null>(null);
  if (!workspace) return null;
  const timeZone = workspace.settings.timeZone;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>Add property</Button>
      </div>
      <div className="space-y-3">
        {workspace.properties.map((property) => {
          const nextReservation = workspace.reservations
            .filter((reservation) => reservation.propertyId === property.id && new Date(reservation.checkoutAt).getTime() >= Date.now() - 60 * 60 * 1000)
            .sort((a, b) => a.checkoutAt.localeCompare(b.checkoutAt))[0];
          const nextTask = workspace.tasks
            .filter((task) => task.propertyId === property.id && task.status !== "completed")
            .sort((a, b) => a.windowStart.localeCompare(b.windowStart))[0];
          const warnings = [
            property.calendarState === "failed" ? property.calendarError ?? "The calendar could not be read." : null,
            nextTask?.status === "blocked" ? "A turnover has no feasible cleaner." : null,
            nextTask?.status === "at_risk" ? "A cleaning is waiting on confirmation." : null,
          ].filter(Boolean);
          return (
            <article key={property.id} className={`rounded-lg border bg-white p-4 ${focus === property.id ? "border-accent" : "border-line"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{property.name}</h2>
                  <p className="mt-1 text-sm text-muted">{maskIcalUrl(property.icalUrl)}</p>
                </div>
                <CalendarBadge state={property.calendarState} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Last successful check</dt>
                  <dd>{property.lastSyncedAt ? formatDateTime(property.lastSyncedAt, timeZone) : "None yet"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Defaults</dt>
                  <dd>Checkout {formatClock(property.checkoutTime)} · Check-in {formatClock(property.checkInTime)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Cleaning duration</dt>
                  <dd>{formatDuration(property.cleaningDurationMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Next reservation</dt>
                  <dd>{nextReservation ? `${formatDay(nextReservation.checkoutAt, timeZone)} ${formatTime(nextReservation.checkoutAt, timeZone)}` : "None imported"}</dd>
                </div>
              </dl>
              {nextTask ? (
                <button type="button" className="mt-3 text-sm text-accent" onClick={() => openTask(nextTask.id)}>
                  Next cleaning {formatDay(nextTask.windowStart, timeZone)} {formatTime(nextTask.windowStart, timeZone)} <StatusBadge status={nextTask.status} />
                </button>
              ) : (
                <p className="mt-3 text-sm text-muted">No upcoming cleaning task.</p>
              )}
              {property.calendarState === "connected" && !property.icalUrl ? <p className="mt-2 text-xs text-muted">Sample reservations are stored on the server.</p> : null}
              {property.calendarState === "connected" && property.icalUrl ? <p className="mt-2 text-xs text-muted">Calendar feed synced. The full URL stays hidden.</p> : null}
              {warnings.length > 0 ? <ul className="mt-3 list-disc pl-5 text-sm text-danger">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(property)}>Edit property</Button>
                <Button size="sm" variant="secondary" disabled={property.calendarState === "syncing"} onClick={() => void retrySync(property.id)}>
                  {property.calendarState === "syncing" ? "Syncing" : "Retry sync"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRemoving(property)}>Remove</Button>
              </div>
            </article>
          );
        })}
      </div>
      {editing ? (
        <PropertyDialog
          property={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input, replaceUrl) => {
            const saved = editing === "new" ? await addProperty(input) : await updateProperty(editing.id, input, replaceUrl);
            if (saved) setEditing(null);
          }}
        />
      ) : null}
      {removing ? (
        <Dialog title="Remove property" onClose={() => setRemoving(null)}>
          <p className="text-sm">Remove {removing.name} and its reservations and cleaning tasks?</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { removeProperty(removing.id); setRemoving(null); }}>Remove property</Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function PropertyDialog({
  property,
  onClose,
  onSave,
}: {
  property: Property | null;
  onClose: () => void;
  onSave: (input: { name: string; icalUrl: string; checkoutTime: string; checkInTime: string; cleaningDurationMinutes: number }, replaceUrl: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(property?.name ?? "");
  const [replaceUrl, setReplaceUrl] = useState(!property);
  const [icalUrl, setIcalUrl] = useState(property ? "" : "");
  const [checkoutTime, setCheckoutTime] = useState(property?.checkoutTime ?? "10:00");
  const [checkInTime, setCheckInTime] = useState(property?.checkInTime ?? "15:00");
  const [duration, setDuration] = useState(property?.cleaningDurationMinutes ?? 120);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog title={property ? "Edit property" : "Add property"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError("Enter a property name.");
            return;
          }
          if ((replaceUrl || !property) && icalUrl.trim() && !icalUrl.trim().startsWith("https://")) {
            setError("Calendar feeds must use https, or leave the URL blank.");
            return;
          }
          setBusy(true);
          void onSave(
            {
              name,
              icalUrl: replaceUrl || !property ? icalUrl : property.icalUrl,
              checkoutTime,
              checkInTime,
              cleaningDurationMinutes: duration,
            },
            replaceUrl || !property,
          ).finally(() => setBusy(false));
        }}
      >
        <Field label="Name" htmlFor="property-name"><TextInput id="property-name" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {property && !replaceUrl ? (
          <div>
            <p className="text-sm font-medium">Calendar URL</p>
            <p className="mt-1 text-sm text-muted">{maskIcalUrl(property.icalUrl)}</p>
            <button type="button" className="mt-2 text-sm font-medium text-accent" onClick={() => setReplaceUrl(true)}>Replace calendar URL</button>
          </div>
        ) : (
          <Field label="iCal calendar URL" htmlFor="property-url" hint="Optional. An https feed is downloaded when you save. Leave this blank to add the property without a feed.">
            <TextInput id="property-url" value={icalUrl} onChange={(event) => setIcalUrl(event.target.value)} placeholder="https://calendar.example.com/property.ics" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Checkout"><SelectInput aria-label="Checkout" value={checkoutTime} onChange={(event) => setCheckoutTime(event.target.value)}>{timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}</SelectInput></Field>
          <Field label="Check-in"><SelectInput aria-label="Check-in" value={checkInTime} onChange={(event) => setCheckInTime(event.target.value)}>{timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}</SelectInput></Field>
        </div>
        <Field label="Cleaning duration">
          <SelectInput aria-label="Cleaning duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Save property"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
