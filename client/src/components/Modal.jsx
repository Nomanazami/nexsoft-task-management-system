import { useEffect } from "react";
import clsx from "clsx";

export default function Modal({ open, title, children, onClose, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={clsx("card w-full max-w-2xl p-5", className)}>
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-black">{title}</div>
            <button className="btn-secondary" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

