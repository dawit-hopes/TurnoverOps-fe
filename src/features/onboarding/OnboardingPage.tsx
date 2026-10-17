import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { CalendarBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, SelectInput, TextInput } from "../../components/ui/Field";
import { WeekdayPicker } from "../../components/ui/WeekdayPicker";
import { formatClock, timeOptions, uid, validateIcalUrl, WEEKDAY_LONG } from "../../domain/format";
import { planningLines } from "../../domain/planningCopy";
import { DURATION_OPTIONS } from "../../domain/labels";
import type { Cleaner, DispatchMode, PlanningRun, Property } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

const steps = ["Properties", "Cleaners", "Review", "Plan", "Approval"];

function PlanSummary({ plan }: { plan: PlanningRun }) {
  const { workspace } = useOps();
  const lines = planningLines(plan, {
    propertyName: (taskId) => {
      const task = workspace?.tasks.find((item) => item.id === taskId);
      return workspace?.properties.find((property) => property.id === task?.propertyId)?.name;
    },
    cleanerName: (cleanerId) => workspace?.cleaners.find((cleaner) => cleaner.id === cleanerId)?.name,
  });
  return (
    <div className="mt-6 space-y-2 rounded-lg border border-line bg-white p-4 text-sm">
      {lines.map((line) => (
        <p key={line.text} className={line.tone === "danger" ? "text-danger" : line.tone === "muted" ? "text-muted" : undefined}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function blankProperty(): Property {
  return {
    id: uid("prop"),
    name: "",
    icalUrl: "",
    checkoutTime: "10:00",
    checkInTime: "15:00",
    cleaningDurationMinutes: 120,
    calendarState: "not_connected",
    syncFailureCount: 0,
  };
}

function blankCleaner(propertyIds: string[] = []): Cleaner {
  return {
    id: uid("cln"),
    name: "",
    email: "",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    startTime: "08:00",
    endTime: "17:00",
    preferredPropertyIds: propertyIds.slice(0, 1),
    maxJobsPerDay: undefined,
    calendarState: "not_connected",
    unavailableDates: [],
  };
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <SelectInput aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {timeOptions().map((time) => (
          <option key={time} value={time}>{formatClock(time)}</option>
        ))}
      </SelectInput>
    </Field>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { host, onboardingComplete, finishOnboarding, confirmConfiguration, approvePlan, signOut } = useOps();
  const [step, setStep] = useState(0);
  const [properties, setProperties] = useState<Property[]>([blankProperty()]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([blankCleaner()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanningRun | null>(null);
  const [planError, setPlanError] = useState("");
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>("review_only");

  useEffect(() => {
    if (!onboardingComplete) return;
    setStep((current) => (current < 3 ? 3 : current));
  }, [onboardingComplete]);

  async function continueToCleaners() {
    const nextErrors: Record<string, string> = {};
    if (properties.length === 0) nextErrors.form = "Add at least one property.";
    for (const property of properties) {
      if (!property.name.trim()) nextErrors[`${property.id}:name`] = "Enter a property name.";
      if (property.checkoutTime >= property.checkInTime) nextErrors[`${property.id}:time`] = "Checkout must be earlier than check-in.";
      if (property.icalUrl.trim()) {
        const urlError = validateIcalUrl(property.icalUrl);
        if (urlError) nextErrors[`${property.id}:url`] = urlError;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setProperties((current) => current.map((property) => ({ ...property, name: property.name.trim(), icalUrl: property.icalUrl.trim() })));
    setStep(1);
  }

  function continueToReview() {
    const nextErrors: Record<string, string> = {};
    if (cleaners.length === 0) nextErrors.cleaners = "Add at least one cleaner.";
    for (const cleaner of cleaners) {
      if (!cleaner.name.trim()) nextErrors[`${cleaner.id}:name`] = "Enter a name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaner.email?.trim() ?? "")) nextErrors[`${cleaner.id}:email`] = "Enter a valid email address.";
      if (cleaner.workingDays.length === 0) nextErrors[`${cleaner.id}:days`] = "Choose at least one working day.";
      if (cleaner.startTime >= cleaner.endTime) nextErrors[`${cleaner.id}:hours`] = "End time must be after the start time.";
      if (cleaner.maxJobsPerDay != null && cleaner.maxJobsPerDay < 1) nextErrors[`${cleaner.id}:max`] = "Use at least 1, or leave this blank.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setCleaners((current) =>
      current.map((cleaner) => ({
        ...cleaner,
        name: cleaner.name.trim(),
        email: cleaner.email?.trim().toLowerCase(),
      })),
    );
    setStep(2);
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            className="cursor-pointer text-sm text-muted"
            onClick={() => {
              signOut();
              navigate("/sign-in");
            }}
          >
            Sign out
          </button>
        </div>
        <p className="mt-6 text-sm text-muted">Step {step + 1} of {steps.length} · {steps[step]}</p>
        <div className="mt-2 grid grid-cols-5 gap-2" aria-hidden="true">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={index < step ? `Back to ${label}` : `${label}, step ${index + 1}`}
              disabled={index > step}
              onClick={() => index < step && setStep(index)}
              className={`h-1.5 cursor-pointer rounded-full ${index <= step ? "bg-accent" : "bg-zinc-200"}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <section className="mt-6 sm:mt-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Let's connect your properties.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Connect your reservation calendars so TurnoverOps can plan cleaning around guest checkouts and arrivals.</p>
            <div className="mt-6 space-y-4">
              {properties.map((property, index) => (
                <article key={property.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Property {index + 1}</h2>
                    <div className="flex items-center gap-2">
                      <CalendarBadge state={property.calendarState} />
                      {properties.length > 1 ? (
                        <button type="button" className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted" onClick={() => setProperties((current) => current.filter((item) => item.id !== property.id))}>
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Property name" htmlFor={`${property.id}-name`} error={errors[`${property.id}:name`]}>
                      <TextInput id={`${property.id}-name`} placeholder="Bole Apartment 1" value={property.name} onChange={(event) => updateProperty(property.id, { name: event.target.value })} />
                    </Field>
                   
                    <Field label="iCal calendar URL" htmlFor={`${property.id}-url`} hint="Optional. A URL is downloaded when you finish setup." error={errors[`${property.id}:url`]}>
                      <TextInput
                        id={`${property.id}-url`}
                        placeholder="https://calendar.example.com/bole-apartment-1.ics"
                        value={property.icalUrl}
                        onChange={(event) => updateProperty(property.id, { icalUrl: event.target.value, calendarState: "not_connected", calendarError: undefined })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                      <TimeField label="Standard checkout" value={property.checkoutTime} onChange={(checkoutTime) => updateProperty(property.id, { checkoutTime })} />
                      <TimeField label="Standard check-in" value={property.checkInTime} onChange={(checkInTime) => updateProperty(property.id, { checkInTime })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Estimated cleaning duration" htmlFor={`${property.id}-duration`}>
                        <SelectInput id={`${property.id}-duration`} value={property.cleaningDurationMinutes} onChange={(event) => updateProperty(property.id, { cleaningDurationMinutes: Number(event.target.value) })}>
                          {DURATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </SelectInput>
                      </Field>
                    </div>
                  </div>
                  {errors[`${property.id}:time`] ? <p className="mt-2 text-xs text-danger">{errors[`${property.id}:time`]}</p> : null}
                </article>
              ))}
            </div>
            <button type="button" className="mt-4 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent" onClick={() => setProperties((current) => [...current, blankProperty()])}>
              <Plus size={16} /> Add another property
            </button>
            {errors.form ? <p className="mt-3 text-sm text-danger">{errors.form}</p> : null}
            <div className="mt-8">
              <Button className="w-full sm:w-auto" onClick={() => void continueToCleaners()} disabled={busy}>Continue to cleaners</Button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-6 sm:mt-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Who handles your turnovers?</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Tell us who is available to clean each property. Assignment emails go to the address you enter here.</p>
            <div className="mt-6 space-y-4">
              {cleaners.map((cleaner, index) => (
                <article key={cleaner.id} className="rounded-lg border border-line bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Cleaner {index + 1}</h2>
                    {cleaners.length > 1 ? (
                      <button type="button" className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted" onClick={() => setCleaners((current) => current.filter((item) => item.id !== cleaner.id))}>
                        <Trash2 size={14} /> Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name" htmlFor={`${cleaner.id}-name`} error={errors[`${cleaner.id}:name`]}>
                      <TextInput id={`${cleaner.id}-name`} value={cleaner.name} onChange={(event) => updateCleaner(cleaner.id, { name: event.target.value })} />
                    </Field>
                    <Field label="Email" htmlFor={`${cleaner.id}-email`} error={errors[`${cleaner.id}:email`]}>
                      <TextInput id={`${cleaner.id}-email`} type="email" placeholder="cleaner@example.com" value={cleaner.email ?? ""} onChange={(event) => updateCleaner(cleaner.id, { email: event.target.value })} />
                    </Field>
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-sm font-medium">Working days</p>
                      <WeekdayPicker value={cleaner.workingDays} onChange={(workingDays) => updateCleaner(cleaner.id, { workingDays })} />
                      {errors[`${cleaner.id}:days`] ? <p className="mt-1 text-xs text-danger">{errors[`${cleaner.id}:days`]}</p> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                      <TimeField label="Start" value={cleaner.startTime} onChange={(startTime) => updateCleaner(cleaner.id, { startTime })} />
                      <TimeField label="End" value={cleaner.endTime} onChange={(endTime) => updateCleaner(cleaner.id, { endTime })} />
                    </div>
                    {errors[`${cleaner.id}:hours`] ? <p className="text-xs text-danger sm:col-span-2">{errors[`${cleaner.id}:hours`]}</p> : null}
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-sm font-medium">Preferred properties</p>
                      <div className="flex flex-wrap gap-2">
                        {properties.map((property) => {
                          const selected = cleaner.preferredPropertyIds.includes(property.id);
                          return (
                            <button key={property.id} type="button" aria-pressed={selected} className={`cursor-pointer rounded-md border px-2 py-1 text-xs ${selected ? "border-accent bg-accent-soft text-accent" : "border-line"}`} onClick={() => updateCleaner(cleaner.id, { preferredPropertyIds: selected ? cleaner.preferredPropertyIds.filter((id) => id !== property.id) : [...cleaner.preferredPropertyIds, property.id] })}>
                              {property.name || "Untitled property"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Maximum jobs per day" htmlFor={`${cleaner.id}-max`} hint="Optional." error={errors[`${cleaner.id}:max`]}>
                        <TextInput id={`${cleaner.id}-max`} type="number" min={1} value={cleaner.maxJobsPerDay ?? ""} onChange={(event) => updateCleaner(cleaner.id, { maxJobsPerDay: event.target.value ? Number(event.target.value) : undefined })} />
                      </Field>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button type="button" className="mt-4 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent" onClick={() => setCleaners((current) => [...current, blankCleaner(properties.map((property) => property.id))])}>
              <Plus size={16} /> Add another cleaner
            </button>
            {errors.cleaners ? <p className="mt-3 text-sm text-danger">{errors.cleaners}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setStep(0)}>Back</Button>
              <Button className="w-full sm:w-auto" onClick={continueToReview}>Review my schedule</Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-6 sm:mt-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your operations, ready to review.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Signed in as {host?.email}. Confirming setup saves these properties and cleaners, syncs calendars, and builds today's plan for review. Each cleaner receives a welcome email with an optional Google Calendar connection link; planning can proceed with configured hours if they skip it.
            </p>
            <div className="mt-6 space-y-3">
              {properties.map((property) => (
                <article key={property.id} className="rounded-lg border border-line bg-white p-4">
                  <h2 className="text-sm font-semibold">{property.name || "Untitled property"}</h2>
                  <p className="mt-1 text-sm text-muted">
                    Checkout {formatClock(property.checkoutTime)} · Check-in {formatClock(property.checkInTime)} · {property.icalUrl || "No calendar URL"}
                  </p>
                </article>
              ))}
              {cleaners.map((cleaner) => (
                <article key={cleaner.id} className="rounded-lg border border-line bg-white p-4">
                  <h2 className="text-sm font-semibold">{cleaner.name}</h2>
                  <p className="mt-1 text-sm text-muted">{cleaner.email}</p>
                  <p className="mt-1 text-sm text-muted">{cleaner.workingDays.map((day) => WEEKDAY_LONG[day]).join(", ")} · {formatClock(cleaner.startTime)}–{formatClock(cleaner.endTime)}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-line bg-white p-4">
              <h2 className="text-sm font-semibold">What TurnoverOps will automate</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                <li>Detect booking changes from connected calendars.</li>
                <li>Recalculate cleaning assignments on the server.</li>
                <li>Reassign tasks when your settings allow it and a valid cleaner exists.</li>
                <li>Email cleaners when a job is assigned. They only need to respond if they cannot do it.</li>
                <li>Escalate unresolved scheduling problems.</li>
              </ul>
            </div>
            {errors.form ? <p className="mt-3 text-sm text-danger">{errors.form}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setStep(1)} disabled={busy}>Back</Button>
              <Button
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setPlanError("");
                  setStep(3);
                  void finishOnboarding(properties, cleaners)
                    .then(() => confirmConfiguration())
                    .then((next) => {
                      setPlan(next);
                    })
                    .catch((error: unknown) => {
                      setErrors({ form: error instanceof Error ? error.message : "Setup could not be saved." });
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? "Saving…" : "Confirm configuration"}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-6 sm:mt-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Review today's plan.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">This plan is saved for review. Cleaners have not been messaged. Retry if a calendar or the planner failed.</p>
            {busy ? (
              <div className="mt-6 max-w-2xl rounded-lg border border-line bg-white p-5" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Building today's assignments</p>
                    <p className="mt-1 text-sm text-muted">Checking calendars and matching cleaners to each turnover.</p>
                  </div>
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-accent-soft" aria-hidden="true">
                  <div className="h-full w-1/3 animate-[progress_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
                </div>
              </div>
            ) : plan ? (
              <PlanSummary plan={plan} />
            ) : (
              <p className="mt-4 text-sm text-muted">No plan has been returned yet.</p>
            )}
            {planError || errors.form ? <p className="mt-3 text-sm text-danger">{planError || errors.form}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setPlanError("");
                  void confirmConfiguration()
                    .then((next) => setPlan(next))
                    .catch((error: unknown) => setPlanError(error instanceof Error ? error.message : "The plan could not be created."))
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? "Retrying…" : "Retry"}
              </Button>
              <Button className="w-full sm:w-auto" disabled={busy || !plan} onClick={() => setStep(4)}>Continue to approval</Button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="mt-6 sm:mt-8">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">How should assignments go out?</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Review only keeps the plan on your dashboard. Automatic emails cleaners for this approved plan and for later daily runs.</p>
            <fieldset className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-4 text-sm">
                <input className="cursor-pointer" type="radio" name="dispatch" checked={dispatchMode === "review_only"} onChange={() => setDispatchMode("review_only")} />
                <span><span className="font-medium">Review only</span><span className="mt-1 block text-muted">Save assignments and leave them undispatched.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-4 text-sm">
                <input className="cursor-pointer" type="radio" name="dispatch" checked={dispatchMode === "automatic"} onChange={() => setDispatchMode("automatic")} />
                <span><span className="font-medium">Automatic</span><span className="mt-1 block text-muted">Message cleaners now if notifications are on, and enable the daily job.</span></span>
              </label>
            </fieldset>
            {planError ? <p className="mt-3 text-sm text-danger">{planError}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setStep(3)} disabled={busy}>Back</Button>
              <Button
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setPlanError("");
                  void approvePlan(dispatchMode)
                    .then(() => navigate("/overview"))
                    .catch((error: unknown) => setPlanError(error instanceof Error ? error.message : "The plan could not be approved."))
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? "Approving…" : "Approve plan and open dashboard"}
              </Button>
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );

  function updateProperty(id: string, patch: Partial<Property>) {
    setProperties((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateCleaner(id: string, patch: Partial<Cleaner>) {
    setCleaners((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
}
