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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {closable ? (
            <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-zinc-100">
              <X size={16} />
            </button>
          ) : null}
        </header>
        <div className="px-5 py-4">{children}</div>
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
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25">
      <button type="button" className="h-full flex-1 cursor-default" aria-label="Close panel" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="flex h-full w-full max-w-xl flex-col border-l border-line bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="drawer-title" className="text-base font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-md p-1 text-muted hover:bg-zinc-100">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
