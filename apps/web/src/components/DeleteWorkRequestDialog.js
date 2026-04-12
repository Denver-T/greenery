"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/Button";

/**
 * Accessible confirm dialog for deleting a work request.
 *
 * Props:
 * - workReq:      the row being deleted (used for the title)
 * - onConfirm:    async () => void — parent performs the DELETE + navigates
 * - onClose:      () => void
 *
 * Parent controls mount/unmount — pass null or conditionally render to
 * close. Do not pass an `open` prop; render the component only when it
 * should be visible, so useState resets on each open.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true"
 * - Initial focus on the Cancel button (safer default than Confirm)
 * - Focus trap: Tab/Shift+Tab cycle within the dialog
 * - Escape closes
 * - Click on backdrop closes
 * - Focus returns to the element that was focused before open
 */
export default function DeleteWorkRequestDialog({
  workReq,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Save / restore focus on mount/unmount
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    // Defer focus so the dialog is mounted
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

  // Escape to close + Tab focus trap
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
      await onConfirm();
    } catch (err) {
      setError(err?.message || "Failed to delete the work request.");
    } finally {
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
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-body"
        className="w-full max-w-md rounded-card border border-border-soft bg-surface p-6 shadow-elevated-lg"
      >
        <h2
          id="delete-dialog-title"
          className="text-lg font-black tracking-tight text-foreground"
        >
          Delete work request?
        </h2>
        <p
          id="delete-dialog-body"
          className="theme-copy mt-3 text-sm leading-6"
        >
          This will remove{" "}
          <span className="font-mono font-semibold text-foreground">
            {workReq?.referenceNumber || "this request"}
          </span>{" "}
          from Greenery and its matching Monday.com item. This cannot be
          undone.
        </p>

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
            variant="danger"
            size="md"
            onClick={handleConfirm}
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Keep Tab/Shift+Tab focus within the dialog.
function trapFocus(event, container) {
  if (!container) return;
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
