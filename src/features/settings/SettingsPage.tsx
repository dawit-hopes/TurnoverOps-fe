import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field, SelectInput, Switch } from "../../components/ui/Field";
import { formatClock, timeOptions } from "../../domain/format";
import { DURATION_OPTIONS } from "../../domain/labels";
import type { DispatchMode, Settings } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

const zones = [
  { value: "Africa/Addis_Ababa", label: "Addis Ababa" },
  { value: "Africa/Nairobi", label: "Nairobi" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "UTC", label: "UTC" },
];

export function SettingsPage() {
  const { workspace, host, saveSettings, connectGoogleCalendar } = useOps();
  const [draft, setDraft] = useState<Settings | null>(workspace?.settings ?? null);
  if (!workspace || !draft) return null;
  const settings = draft;

  function patch(partial: Partial<Settings>) {
    setDraft({ ...settings, ...partial });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">Name</dt><dd>{host?.name}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd>{host?.email}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Sign-in</dt><dd>Google</dd></div>
        </dl>
      </section>
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Scheduling defaults</h2>
        <div className="mt-3 space-y-3">
          <Field label="Time zone">
            <SelectInput aria-label="Time zone" value={settings.timeZone} onChange={(event) => patch({ timeZone: event.target.value })}>
              {zones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default checkout">
              <SelectInput aria-label="Default checkout" value={settings.defaultCheckoutTime} onChange={(event) => patch({ defaultCheckoutTime: event.target.value })}>
                {timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}
              </SelectInput>
            </Field>
            <Field label="Default check-in">
              <SelectInput aria-label="Default check-in" value={settings.defaultCheckInTime} onChange={(event) => patch({ defaultCheckInTime: event.target.value })}>
                {timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}
              </SelectInput>
            </Field>
          </div>
          <Field label="Default cleaning duration">
            <SelectInput aria-label="Default cleaning duration" value={settings.defaultCleaningDurationMinutes} onChange={(event) => patch({ defaultCleaningDurationMinutes: Number(event.target.value) })}>
              {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Calendar check interval" hint="The server waits this long after a property's last sync before checking its iCal feed again.">
            <SelectInput aria-label="Sync interval" value={settings.syncIntervalMinutes} onChange={(event) => patch({ syncIntervalMinutes: Number(event.target.value) })}>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </SelectInput>
          </Field>
          <Field label="Daily plan time" hint="The server builds today's plan once the clock in your time zone reaches this time. Calendar checks stay on the interval above. There is no webhook.">
            <SelectInput aria-label="Daily plan time" value={settings.dailyPlanTime} onChange={(event) => patch({ dailyPlanTime: event.target.value })}>
              {timeOptions().map((time) => <option key={time} value={time}>{formatClock(time)}</option>)}
            </SelectInput>
          </Field>
          <Field label="Cleaner dispatch">
            <SelectInput aria-label="Dispatch mode" value={settings.dispatchMode} onChange={(event) => patch({ dispatchMode: event.target.value as DispatchMode })}>
              <option value="review_only">Review only — save the plan and do not message cleaners</option>
              <option value="automatic">Automatic — message cleaners after the plan is approved</option>
            </SelectInput>
          </Field>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white px-4">
        <h2 className="pt-4 text-sm font-semibold">Assignment and notifications</h2>
        <div className="divide-y divide-line">
          <Switch checked={settings.dailyPlanningEnabled} onChange={(dailyPlanningEnabled) => patch({ dailyPlanningEnabled })} label="Daily planning" description="Run one plan each day after the daily plan time. A plan still has to be approved before cleaners are messaged." />
          <Switch checked={settings.allowFastPath} onChange={(allowFastPath) => patch({ allowFastPath })} label="Assign an obvious single cleaning" description="When one cleaning has one cleaner who can take it, and nobody else needs that time, save the assignment without extra scheduling review." />
          <Switch checked={settings.autoReassignment} onChange={(autoReassignment) => patch({ autoReassignment })} label="Automatic reassignment" description="When a cleaner declines, assign the next person who can take the job." />
          <Switch checked={settings.notifyCleaners} onChange={(notifyCleaners) => patch({ notifyCleaners })} label="Notify cleaners" description="Email a cleaner when a job is assigned. They only need to act if they cannot do it." />
          <Switch checked={settings.notifyHostOnEscalation} onChange={(notifyHostOnEscalation) => patch({ notifyHostOnEscalation })} label="Escalate when nobody can take the job" description="Unresolved conflicts appear in Needs attention." />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Connections</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <dt className="font-medium">Cleaner email</dt>
              <dd className="text-muted">Assignment and weekly schedule emails are sent from the server. SMTP credentials stay on the server and are not shown here.</dd>
            </div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <dt className="font-medium">Google Calendar</dt>
              <dd className="text-muted">{settings.googleCalendarConnected ? "Connected. Confirmed cleanings can be published to your calendar." : "Not connected. Property iCal feeds are separate from this account connection."}</dd>
            </div>
            {settings.googleCalendarConnected ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">Connected</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void connectGoogleCalendar()}>Connect</Button>
            )}
          </div>
        </dl>
      </section>
      <Button
        onClick={() => {
          saveSettings(settings);
        }}
      >
        Save settings
      </Button>
    </div>
  );
}
