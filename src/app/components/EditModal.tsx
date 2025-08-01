"use client";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";

interface EditModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
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
    try {
      setSaving(true);
      await onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Ensure we have a DOM (not SSR) and portal target exists
  const portalTarget = typeof window !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={saving ? undefined : onClose}
            aria-label="Close modal"
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={saving}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="relative bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2 rounded disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving && (
              <svg
                className="animate-spin h-4 w-4 mr-2 absolute left-2 top-1/2 -translate-y-1/2 text-white"
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
