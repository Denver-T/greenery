"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/Button";
import SelectChevron from "@/components/SelectChevron";
import { fetchApi } from "@/lib/api/api";
import { trapFocus } from "@/lib/dialogA11y";

/**
 * Dialog that schedules a work request — creates a schedule_events row
 * with event_type='request' tied to the given work request.
 *
 * Props:
 * - workReq:      the row being scheduled (used for the reference strip)
 * - employees:    array of {id, name} — the technician picker options
 * - onClose:      () => void
 * - onScheduled:  (createdEvent) => void — fires AFTER a successful create.
 *                 Parent typically reloads the work request data.
 *
 * Parent controls mount/unmount via conditional render — do NOT pass an
 * `open` prop. Same pattern as DeleteWorkRequestDialog.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true"
 * - Initial focus on the Start time input (this is a form, not a confirm —
 *   land on the first input rather than Cancel)
 * - Tab/Shift+Tab focus trap via shared trapFocus helper
 * - Escape closes
 * - Backdrop click closes
 * - Focus return on unmount
 */
export default function ScheduleRequestDialog({
  workReq,
  employees = [],
  onClose,
  onScheduled,
}) {
  const dialogRef = useRef(null);
  const startInputRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Save / restore focus on mount/unmount
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    const timer = setTimeout(() => {
      startInputRef.current?.focus();
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

  // Escape + Tab focus trap
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

  // Inline validation for the time-order rule. Cleared as soon as the user
  // changes either time so the error doesn't linger after a fix.
  const timeOrderError =
    startTime && endTime && new Date(startTime) >= new Date(endTime)
      ? "End must be after start."
      : "";

  const canSubmit = !!startTime && !!endTime && !timeOrderError && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await fetchApi(
        `/reqs/${workReq.id}/schedule-events`,
        {
          method: "POST",
          body: {
            start_time: startTime,
            end_time: endTime,
            employee_id: employeeId === "" ? null : Number(employeeId),
            details: details.trim() || null,
          },
        },
      );
      onScheduled?.(created);
    } catch (err) {
      setError(err?.message || "Failed to schedule this request.");
    } finally {
      setSubmitting(false);
    }
  }

  const referenceText = workReq?.referenceNumber || `Request #${workReq?.id}`;
  const actionText = workReq?.actionRequired || "";
  const referenceStrip = actionText
    ? `${referenceText} · ${actionText.slice(0, 60)}`
    : referenceText;

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
        aria-labelledby="schedule-dialog-title"
        className="w-full max-w-lg rounded-card border border-border-soft bg-surface p-6 shadow-elevated-lg"
      >
        <h2
          id="schedule-dialog-title"
          className="text-lg font-black tracking-tight text-foreground"
        >
          Schedule this request
        </h2>
        <div
          className="theme-tag mt-2 inline-block max-w-full truncate rounded-full px-3 py-1 font-mono text-xs"
          title={referenceStrip}
        >
          {referenceStrip}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="schedule-start"
                className="text-sm font-medium text-foreground"
              >
                Start time
              </label>
              <input
                ref={startInputRef}
                id="schedule-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-border-soft bg-surface px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div>
              <label
                htmlFor="schedule-end"
                className="text-sm font-medium text-foreground"
              >
                End time
              </label>
              <input
                id="schedule-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                aria-invalid={timeOrderError ? "true" : undefined}
                aria-describedby={timeOrderError ? "schedule-time-error" : undefined}
                className="mt-1 w-full rounded-xl border border-border-soft bg-surface px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-brand/40"
              />
              {timeOrderError ? (
                <p
                  id="schedule-time-error"
                  className="mt-1 text-xs font-medium text-danger"
                >
                  {timeOrderError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="schedule-employee"
              className="text-sm font-medium text-foreground"
            >
              Assign to
            </label>
            <div className="relative mt-1">
              <select
                id="schedule-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none truncate rounded-xl border border-border-soft bg-surface py-2.5 pl-3 pr-10 text-foreground outline-none focus:ring-2 focus:ring-brand/40"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="schedule-details"
              className="text-sm font-medium text-foreground"
            >
              Details (optional)
            </label>
            <textarea
              id="schedule-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              placeholder="What the tech should know about this visit."
              className="mt-1 w-full rounded-xl border border-border-soft bg-surface px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
            />
          </div>

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
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={!canSubmit}
            >
              {submitting ? "Scheduling…" : "Schedule →"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
