"use client";

import Button from "@/components/Button";

/**
 * Presentational list of schedule_events linked to a work request.
 *
 * Props:
 * - events:        array of {id, start_time, end_time, employee_name, details}
 * - workReqStatus: parent work_req status (string) — when 'completed', rows
 *                  render in a dimmed completed state with no Unschedule
 * - onUnschedule:  (eventId) => void OR null. If null/omitted, the per-row
 *                  Unschedule button does NOT render. The parent gates this
 *                  by Manager+ permission.
 * - unscheduling:  optional id of an event currently being unscheduled —
 *                  disables that row's button while the request is in flight
 */
export default function LinkedScheduleList({
  events = [],
  workReqStatus = null,
  onUnschedule = null,
  unscheduling = null,
}) {
  const isCompleted = String(workReqStatus || "").toLowerCase() === "completed";

  if (!events || events.length === 0) {
    return (
      <div className="mt-5 rounded-card border border-dashed border-border-soft bg-surface-warm p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          Not yet scheduled
        </p>
        <p className="theme-copy mt-1 text-xs">
          Use &ldquo;Schedule this request&rdquo; to put this on the calendar.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className={`theme-subcard rounded-card border border-border-soft p-4 ${
            isCompleted ? "opacity-70" : ""
          }`}
        >
          {isCompleted ? (
            <span className="mb-2 inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
              Completed
            </span>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground">
                {formatRange(event.start_time, event.end_time)}
              </div>
            </div>
            <div className="shrink-0 text-right text-sm font-medium text-foreground">
              {event.employee_name || (
                <span className="italic text-muted">Unassigned</span>
              )}
            </div>
          </div>
          <div className="mt-3 border-t border-border-soft/60" />
          <p className="mt-3 line-clamp-2 text-sm theme-copy">
            {event.details || (
              <span className="italic">No details</span>
            )}
          </p>
          {!isCompleted && onUnschedule ? (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnschedule(event.id)}
                disabled={unscheduling === event.id}
                aria-label={buildUnscheduleLabel(event)}
              >
                {unscheduling === event.id ? "Unscheduling…" : "Unschedule →"}
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function formatRange(startIso, endIso) {
  if (!startIso) return "Time not set";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "Time not set";

  const dayLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endIso) return `${dayLabel} · ${startLabel}`;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return `${dayLabel} · ${startLabel}`;

  const endLabel = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dayLabel} · ${startLabel} – ${endLabel}`;
}

function buildUnscheduleLabel(event) {
  const range = formatRange(event.start_time, event.end_time);
  const tech = event.employee_name || "unassigned";
  return `Unschedule event ${range} for ${tech}`;
}
