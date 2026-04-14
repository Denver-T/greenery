"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/Button";
import { trapFocus } from "@/lib/dialogA11y";

/**
 * Accessible confirm dialog for marking a work request complete.
 *
 * Props:
 * - workReq:   the row being completed (used for the title)
 * - onConfirm: async ({ autoCloseScheduleEvents }) => void — parent performs
 *              the PUT (the dialog does NOT call onClose after success; the
 *              parent closes via its own state once the reload settles, so
 *              the dialog stays visible while the PUT is in flight and
 *              disappears in a single render with the refreshed data).
 * - onClose:   () => void
 *
 * Parent controls mount/unmount — render only when visible so useState
 * resets on each open. Initial focus lands on Cancel (safer default).
 */
export default function MarkCompleteDialog({ workReq, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const mountedRef = useRef(true);
  const [autoClose, setAutoClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (
        previouslyFocusedRef.current &&
        typeof previouslyFocusedRef.current.focus === "function"
      ) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        trapFocus(e, dialogRef.current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm({ autoCloseScheduleEvents: autoClose });
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "Failed to mark this work request complete.");
        setSubmitting(false);
      }
      return;
    }
    // Success path: the parent will unmount us after its reload resolves.
    // Only clear `submitting` if we're still mounted — skipping the
    // setState on an unmounted component.
    if (mountedRef.current) {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-complete-dialog-title"
        aria-describedby="mark-complete-dialog-body"
        className="w-full max-w-md rounded-card border border-border-soft bg-surface p-6 shadow-elevated-lg"
      >
        <h2
          id="mark-complete-dialog-title"
          className="text-lg font-black tracking-tight text-foreground"
        >
          Mark complete?
        </h2>
        <p
          id="mark-complete-dialog-body"
          className="theme-copy mt-3 text-sm leading-6"
        >
          This will mark{" "}
          <span className="font-mono font-semibold text-foreground">
            {workReq?.referenceNumber || "this request"}
          </span>{" "}
          as completed. The change will sync to Monday.com.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border-soft bg-surface-warm p-3">
          <input
            type="checkbox"
            checked={autoClose}
            onChange={(e) => setAutoClose(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-700)]"
          />
          <span className="text-sm leading-5 text-foreground">
            Remove scheduled calendar events for this request
            <span className="theme-copy block text-xs">
              Default keeps the event on the calendar as a completed receipt.
            </span>
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "Marking…" : "Mark Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
