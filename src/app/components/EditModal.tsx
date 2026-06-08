"use client";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";

interface EditModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  saveDisabled?: boolean;
  /**
   * The save handler **must** return either void or a Promise. If it returns a
   * Promise the modal will remain open (and show a loading spinner) until the
   * promise resolves or rejects.
   */
  onSave: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function EditModal({
  title,
  isOpen,
  onClose,
  saveDisabled = false,
  onSave,
  children,
}: EditModalProps) {
  const [saving, setSaving] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (saveDisabled || saving) return;

    try {
      setSaving(true);
      await onSave();
      setSaving(false);
      onClose();
    } catch (error) {
      setSaving(false);
      throw error;
    }
  };

  // Ensure we have a DOM (not SSR) and portal target exists
  const portalTarget = typeof window !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-2 py-2 backdrop-blur-md sm:items-center sm:px-4 sm:py-6"
    >
      <div className="relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.22)] animate-fade-in sm:max-h-[90vh] sm:rounded-[34px]">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="relative shrink-0 border-b border-slate-200/80 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 space-y-1.5 sm:space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 sm:text-[11px] sm:tracking-[0.24em]">
                Editor
              </p>
              <h2 className="dashboard-wrap-text dashboard-line-clamp-2 text-xl font-semibold tracking-normal text-slate-900 sm:text-2xl">
                {title}
              </h2>
            </div>
            <button
              onClick={saving ? undefined : onClose}
              aria-label="Close modal"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus:outline-none"
              disabled={saving}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
          {children}
        </div>

        <div className="relative z-10 grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200/80 bg-white/92 px-4 py-3 backdrop-blur sm:flex sm:justify-end sm:gap-3 sm:px-8 sm:py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:rounded-2xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saveDisabled}
            className={`relative rounded-lg px-5 py-2.5 font-medium transition sm:rounded-2xl ${
              saveDisabled && !saving
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            }`}
          >
            {saving && (
              <svg
                className="absolute left-2 top-1/2 mr-2 h-4 w-4 -translate-y-1/2 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                />
              </svg>
            )}
            <span className={saving ? "ml-4" : ""}>Save</span>
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
