import { useEffect, useRef, useState, type ReactNode } from "react";

export function Menu({
  label,
  align = "right",
  children,
}: {
  label: ReactNode;
  align?: "left" | "right";
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((value) => !value)}>{label}</div>
      {open ? (
        <div className={`absolute z-30 mt-2 min-w-56 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-white p-1 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-muted"
    >
      {children}
    </button>
  );
}
