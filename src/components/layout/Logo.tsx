import { CalendarClock } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-white">
        <CalendarClock size={16} aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight text-ink">TurnoverOps</span>
    </div>
  );
}
