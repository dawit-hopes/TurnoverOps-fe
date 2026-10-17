import { useMemo, useState } from "react";
import { OutcomeBadge } from "../../components/ui/Badge";
import { SelectInput } from "../../components/ui/Field";
import { ACTIVITY_TYPE_LABEL, OUTCOME_LABEL } from "../../domain/labels";
import { clientSentence } from "../../domain/planningCopy";
import { formatDateTime, zonedDateKey } from "../../domain/format";
import type { ActivityOutcome, ActivityType } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

export function ActivityPage() {
  const { workspace, openTask } = useOps();
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const events = useMemo(() => {
    if (!workspace) return [];
    return [...workspace.activity]
      .filter((item) => {
        if (propertyId && item.propertyId !== propertyId) return false;
        if (cleanerId && item.cleanerId !== cleanerId) return false;
        if (date && zonedDateKey(item.at, workspace.settings.timeZone) !== date) return false;
        if (type && item.type !== type) return false;
        if (outcome && item.outcome !== outcome) return false;
        return true;
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [workspace, propertyId, cleanerId, date, type, outcome]);

  if (!workspace) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">This log is stored by the API. Host actions and assignment changes appear here after they are saved.</p>
      <div className="grid gap-2 md:grid-cols-5">
        <SelectInput aria-label="Property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
          <option value="">All properties</option>
          {workspace.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
        </SelectInput>
        <SelectInput aria-label="Cleaner" value={cleanerId} onChange={(event) => setCleanerId(event.target.value)}>
          <option value="">All cleaners</option>
          {workspace.cleaners.map((cleaner) => <option key={cleaner.id} value={cleaner.id}>{cleaner.name}</option>)}
        </SelectInput>
        <input type="date" aria-label="Date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-md border border-line px-3 py-2 text-sm" />
        <SelectInput aria-label="Event type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All events</option>
          {(Object.keys(ACTIVITY_TYPE_LABEL) as ActivityType[]).map((item) => <option key={item} value={item}>{ACTIVITY_TYPE_LABEL[item]}</option>)}
        </SelectInput>
        <SelectInput aria-label="Outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
          <option value="">All outcomes</option>
          {(Object.keys(OUTCOME_LABEL) as ActivityOutcome[]).map((item) => <option key={item} value={item}>{OUTCOME_LABEL[item]}</option>)}
        </SelectInput>
      </div>
      {events.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-8 text-sm text-muted">No events match these filters.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {events.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpenId(openId === item.id ? null : item.id)} aria-expanded={openId === item.id}>
                <span>
                  <span className="block text-sm font-medium">{clientSentence(item.title, "Schedule update")}</span>
                  <span className="mt-1 block text-xs text-muted">{formatDateTime(item.at, workspace.settings.timeZone)}{item.reason && item.reason !== item.title ? ` · ${clientSentence(item.reason, "")}` : ""}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {item.source === "simulated" ? <span className="text-xs text-muted">Simulated</span> : null}
                  {item.source === "host" ? <span className="text-xs text-muted">Host</span> : null}
                  <OutcomeBadge outcome={item.outcome} />
                </span>
              </button>
              {openId === item.id ? (
                <div className="mt-3 text-sm text-muted">
                  <p>{ACTIVITY_TYPE_LABEL[item.type]}</p>
                  {item.detail ? <p className="mt-1">{clientSentence(item.detail, "")}</p> : null}
                  {item.reason && item.reason !== item.title ? <p className="mt-1">{clientSentence(item.reason, "")}</p> : null}
                  {item.taskId ? (
                    <button type="button" className="mt-2 font-medium text-accent" onClick={() => openTask(item.taskId!)}>Open task</button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
