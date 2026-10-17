import { WEEKDAY_LABEL, WEEKDAYS, cn } from "../../domain/format";
import type { Weekday } from "../../domain/types";

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Working days">
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? value.filter((item) => item !== day) : [...value, day])}
            className={cn(
              "h-8 min-w-10 cursor-pointer rounded-md border px-2 text-xs font-medium",
              selected ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-muted",
            )}
          >
            {WEEKDAY_LABEL[day]}
          </button>
        );
      })}
    </div>
  );
}
