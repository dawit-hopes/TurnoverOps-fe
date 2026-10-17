import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  title,
  onClose,
  children,
  closable = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
}) {
  useEffect(() => {
    if (!closable) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closable, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-2 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {closable ? (
            <button type="button" onClick={onClose} aria-label="Close dialog" className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-zinc-100">
              <X size={18} />
            </button>
          ) : null}
        </header>
        <div className="px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-ink/30 transition-opacity" aria-hidden="true" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="relative z-10 flex h-full w-full flex-col border-l border-line bg-white shadow-2xl sm:max-w-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 id="drawer-title" className="text-base font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-zinc-100">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
