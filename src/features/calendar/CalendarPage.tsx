import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { SelectInput } from "../../components/ui/Field";
import { addDaysKey, formatDayKey, formatTime, minutesOfDay, todayKey, weekdayOfKey, zonedDateKey } from "../../domain/format";
import type { TaskStatus } from "../../domain/types";
import { useOps } from "../../state/OperationsContext";

const HOUR_HEIGHT = 52;
const DAY_MINUTES = 24 * 60;
const GRID_HEIGHT = 24 * HOUR_HEIGHT;

export function CalendarPage() {
  const { workspace, openTask } = useOps();
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [cursor, setCursor] = useState(() => todayKey(workspace?.settings.timeZone ?? "Africa/Addis_Ababa"));
  const [now, setNow] = useState(() => new Date());
  const [mobileView, setMobileView] = useState<"day" | "week">("day");
  const [activeDay, setActiveDay] = useState<string>(() => todayKey(workspace?.settings.timeZone ?? "Africa/Addis_Ababa"));
  const scrollerRef = useRef<HTMLDivElement>(null);
  const timeZone = workspace?.settings.timeZone ?? "Africa/Addis_Ababa";
  const weekStart = useMemo(() => startOfWeek(cursor, timeZone), [cursor, timeZone]);
  const days = Array.from({ length: 7 }, (_, index) => addDaysKey(weekStart, index));
  const today = todayKey(timeZone, now);
  const nowMinutes = minutesOfDay(now.toISOString(), timeZone);
  const showNow = days.includes(today);

  // Keep activeDay in current week if week cursor shifts
  const selectedDay = days.includes(activeDay) ? activeDay : (days.includes(today) ? today : days[0]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || (!showNow && mobileView !== "day")) return;
    const top = (minutesOfDay(new Date().toISOString(), timeZone) / 60) * HOUR_HEIGHT;
    scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3);
  }, [showNow, timeZone, weekStart, mobileView, selectedDay]);

  if (!workspace) return null;

  return (
    <div className="space-y-4">
      {cleanerId ? <p className="text-sm text-muted">Cleaning blocks are limited to the selected cleaner. Checkouts and check-ins stay visible.</p> : null}
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" aria-label="Previous week" onClick={() => setCursor(addDaysKey(weekStart, -7))}><ChevronLeft size={16} /></Button>
            <Button variant="secondary" size="sm" onClick={() => { setCursor(todayKey(timeZone)); setActiveDay(todayKey(timeZone)); }}>This week</Button>
            <Button variant="secondary" size="sm" aria-label="Next week" onClick={() => setCursor(addDaysKey(weekStart, 7))}><ChevronRight size={16} /></Button>
          </div>
          <p className="text-xs text-muted sm:text-sm">{formatDayKey(days[0], timeZone)} – {formatDayKey(days[6], timeZone)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
          <SelectInput aria-label="Property" className="w-full sm:w-auto" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">All properties</option>
            {workspace.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </SelectInput>
          <SelectInput aria-label="Cleaner" className="w-full sm:w-auto" value={cleanerId} onChange={(event) => setCleanerId(event.target.value)}>
            <option value="">All cleaners</option>
            {workspace.cleaners.map((cleaner) => <option key={cleaner.id} value={cleaner.id}>{cleaner.name}</option>)}
          </SelectInput>
        </div>
      </div>

      {/* Mobile Day / Week view switcher & Day selector tabs */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">View Mode</span>
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-medium transition ${mobileView === "day" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
              onClick={() => setMobileView("day")}
            >
              Day view
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-medium transition ${mobileView === "week" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
              onClick={() => setMobileView("week")}
            >
              7-day grid
            </button>
          </div>
        </div>

        {mobileView === "day" && (
          <div className="flex gap-1 overflow-x-auto pb-1 pt-0.5">
            {days.map((day) => {
              const isSelected = day === selectedDay;
              const isToday = day === today;
              const dayLabel = formatDayKey(day, timeZone);
              // Split day into short day name (e.g. Mon) and date (e.g. 17)
              const parts = dayLabel.split(" ");
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`flex flex-1 min-w-10 flex-col items-center rounded-lg border px-1.5 py-1.5 text-xs transition cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent text-white shadow-xs"
                      : isToday
                      ? "border-danger/40 bg-danger-soft text-danger"
                      : "border-line bg-white text-ink hover:bg-zinc-50"
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase ${isSelected ? "text-white/80" : "text-muted"}`}>
                    {parts[0]}
                  </span>
                  <span className="text-xs font-semibold">{parts[1] || ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={scrollerRef} className="max-h-[calc(100vh-14rem)] overflow-auto rounded-lg border border-line bg-white">
        {mobileView === "day" ? (
          /* Mobile Single Day View */
          <div className="md:hidden">
            <div className="sticky top-0 z-30 grid grid-cols-[4rem_1fr] border-b border-line bg-white">
              <div />
              <h2 className={`border-l border-line px-3 py-2 text-sm font-semibold ${selectedDay === today ? "text-danger" : ""}`}>
                {formatDayKey(selectedDay, timeZone)}{selectedDay === today ? " · Today" : ""}
              </h2>
            </div>
            <div className="relative grid grid-cols-[4rem_1fr]" style={{ height: GRID_HEIGHT }}>
              <div className="relative">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted" style={{ top: hour * HOUR_HEIGHT }}>
                    {hour === 0 ? "" : hourLabel(hour)}
                  </div>
                ))}
                {selectedDay === today ? (
                  <div className="absolute right-1 z-20 -translate-y-1/2" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                    <span className="rounded bg-danger px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {formatTime(now.toISOString(), timeZone)}
                    </span>
                  </div>
                ) : null}
              </div>
              <DayColumn
                day={selectedDay}
                isToday={selectedDay === today}
                nowMinutes={nowMinutes}
                timeZone={timeZone}
                propertyId={propertyId}
                cleanerId={cleanerId}
                workspace={workspace}
                onOpenTask={openTask}
              />
            </div>
          </div>
        ) : null}

        {/* Full 7-Day Grid View (shown on md+ or when mobileView === "week") */}
        <div className={`min-w-[880px] ${mobileView === "day" ? "hidden md:block" : "block"}`}>
          <div className="sticky top-0 z-30 grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] border-b border-line bg-white">
            <div />
            {days.map((day) => (
              <h2 key={day} className={`border-l border-line px-2 py-2 text-sm font-medium ${day === today ? "text-danger" : ""}`}>
                {formatDayKey(day, timeZone)}
              </h2>
            ))}
          </div>
          <div className="relative grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]" style={{ height: GRID_HEIGHT }}>
            <div className="relative">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted" style={{ top: hour * HOUR_HEIGHT }}>
                  {hour === 0 ? "" : hourLabel(hour)}
                </div>
              ))}
              {showNow ? (
                <div className="absolute right-1 z-20 -translate-y-1/2" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                  <span className="rounded bg-danger px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {formatTime(now.toISOString(), timeZone)}
                  </span>
                </div>
              ) : null}
            </div>
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                isToday={day === today}
                nowMinutes={nowMinutes}
                timeZone={timeZone}
                propertyId={propertyId}
                cleanerId={cleanerId}
                workspace={workspace}
                onOpenTask={openTask}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  isToday,
  nowMinutes,
  timeZone,
  propertyId,
  cleanerId,
  workspace,
  onOpenTask,
}: {
  day: string;
  isToday: boolean;
  nowMinutes: number;
  timeZone: string;
  propertyId: string;
  cleanerId: string;
  workspace: NonNullable<ReturnType<typeof useOps>["workspace"]>;
  onOpenTask: (id: string) => void;
}) {
  const events = useMemo(() => {
    const items: CalendarEvent[] = [];
    for (const reservation of workspace.reservations) {
      if (propertyId && reservation.propertyId !== propertyId) continue;
      const propertyName = workspace.properties.find((property) => property.id === reservation.propertyId)?.name ?? "Property";
      if (zonedDateKey(reservation.checkoutAt, timeZone) === day) {
        items.push({
          id: `${reservation.id}-out`,
          kind: "checkout",
          start: reservation.checkoutAt,
          end: reservation.checkoutAt,
          title: "Checkout",
          detail: propertyName,
        });
      }
      if (zonedDateKey(reservation.checkInAt, timeZone) === day) {
        items.push({
          id: `${reservation.id}-in`,
          kind: "checkin",
          start: reservation.checkInAt,
          end: reservation.checkInAt,
          title: "Check-in",
          detail: propertyName,
        });
      }
    }
    for (const task of workspace.tasks) {
      if (zonedDateKey(task.windowStart, timeZone) !== day) continue;
      if (propertyId && task.propertyId !== propertyId) continue;
      if (cleanerId && task.cleanerId !== cleanerId) continue;
      const propertyName = workspace.properties.find((property) => property.id === task.propertyId)?.name ?? "Property";
      const cleanerName = workspace.cleaners.find((cleaner) => cleaner.id === task.cleanerId)?.name ?? "Unassigned";
      items.push({
        id: task.id,
        kind: "cleaning",
        start: task.windowStart,
        end: task.windowEnd,
        title: "Cleaning",
        detail: `${propertyName} · ${cleanerName}`,
        status: task.status,
        taskId: task.id,
      });
    }
    return placeEvents(items, timeZone);
  }, [cleanerId, day, propertyId, timeZone, workspace]);

  return (
    <div className={`relative min-w-0 border-l border-line ${isToday ? "bg-danger-soft/40" : ""}`}>
      {Array.from({ length: 24 }, (_, hour) => (
        <div key={hour} className="absolute inset-x-0 border-t border-line" style={{ top: hour * HOUR_HEIGHT }} />
      ))}
      {events.map((event) => {
        const body = (
          <>
            <span className="flex flex-wrap items-center gap-1">
              <span className="font-medium">{event.title}</span>
              {event.status ? <StatusBadge status={event.status} /> : null}
            </span>
            <span className="mt-0.5 block break-words text-muted">
              {formatTime(event.start, timeZone)}
              {event.kind === "cleaning" ? `–${formatTime(event.end, timeZone)}` : ""} · {event.detail}
            </span>
          </>
        );
        const className = "absolute inset-x-1 z-10 overflow-visible rounded-md border border-line bg-white px-1.5 py-1 text-[11px] leading-snug break-words";
        const style = { top: event.top };
        if (event.taskId) {
          return (
            <button key={event.id} type="button" className={`${className} text-left hover:bg-zinc-50`} style={style} onClick={() => onOpenTask(event.taskId!)}>
              {body}
            </button>
          );
        }
        return (
          <div key={event.id} className={className} style={style}>
            {body}
          </div>
        );
      })}
      {isToday ? (
        <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} role="img" aria-label={`Current time ${formatTime(new Date().toISOString(), timeZone)}`}>
          <span className="absolute -left-1 -top-[5px] size-2.5 rounded-full bg-danger" />
          <span className="block h-0.5 bg-danger" />
        </div>
      ) : null}
    </div>
  );
}

type CalendarEvent = {
  id: string;
  kind: "checkout" | "checkin" | "cleaning";
  start: string;
  end: string;
  title: string;
  detail: string;
  status?: TaskStatus;
  taskId?: string;
};

type PlacedEvent = CalendarEvent & {
  top: number;
};

const CARD_HEIGHT = 72;

function placeEvents(events: CalendarEvent[], timeZone: string): PlacedEvent[] {
  const sorted = [...events].sort((left, right) => minutesOfDay(left.start, timeZone) - minutesOfDay(right.start, timeZone));
  let occupiedUntil = 0;
  return sorted.map((event) => {
    const startMinutes = minutesOfDay(event.start, timeZone);
    const naturalTop = (startMinutes / DAY_MINUTES) * GRID_HEIGHT;
    const top = Math.min(Math.max(naturalTop, occupiedUntil), GRID_HEIGHT - CARD_HEIGHT);
    occupiedUntil = top + CARD_HEIGHT + 4;
    return { ...event, top };
  });
}

function hourLabel(hour: number) {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function startOfWeek(dateKey: string, timeZone: string) {
  const weekday = weekdayOfKey(dateKey, timeZone);
  const index = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(weekday);
  return addDaysKey(dateKey, -index);
}
