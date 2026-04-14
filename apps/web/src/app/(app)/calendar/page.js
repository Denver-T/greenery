"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { fetchApi } from "@/lib/api/api";
import { formatDateLabel } from "@/lib/inputSafety";

const pad = (n) => String(n).padStart(2, "0");
const toLocalDateKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const emptyEventForm = {
  id: null,
  title: "",
  details: "",
  start_time: "",
  end_time: "",
  audience_level: "technician",
  employee_id: "",
};

const fromYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const monthLabel = (y, mZero) =>
  new Date(y, mZero, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

function buildMonthGrid(year, monthZero) {
  const first = new Date(year, monthZero, 1);
  const startDow = first.getDay();
  const gridStart = new Date(year, monthZero, 1 - startDow);
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    cells.push({
      date: d,
      inMonth: d.getMonth() === monthZero,
      key: toLocalDateKey(d),
    });
  }

  return cells;
}

function normalizeAccessLevel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "superadmin") return "admin";
  if (normalized === "administrator") return "admin";
  if (normalized === "manager") return "manager";
  return "technician";
}

function canManageEvents(user) {
  return normalizeAccessLevel(user?.permissionLevel || user?.role) === "admin";
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatEventTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Friendly labels for work_reqs.status values displayed on calendar cards.
// Keeps raw DB values (unassigned, in_progress, etc.) out of the UI.
const WORK_REQ_STATUS_LABELS = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatWorkReqStatus(raw) {
  if (!raw) return "";
  return WORK_REQ_STATUS_LABELS[raw] || raw;
}

function buildEventForm(event) {
  return {
    id: event?.id || null,
    title: event?.title || "",
    details: event?.details || "",
    start_time: toDateTimeLocalValue(event?.start_time),
    end_time: toDateTimeLocalValue(event?.end_time),
    audience_level: event?.audience_level || "technician",
    employee_id: event?.employee_id
      ? String(event.employee_id)
      : event?.employeeId
        ? String(event.employeeId)
        : "",
  };
}

async function fetchScheduleRows(from, to) {
  try {
    const response = await fetchApi("/schedule", { cache: "no-store" });
    const rows = Array.isArray(response) ? response : response?.data || [];

    return rows
      .filter((row) => {
        const dateKey = toLocalDateKey(new Date(row.start_time));
        return dateKey >= from && dateKey <= to;
      })
      .map((row) => {
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);
        const kind = row.event_type === "custom" ? "custom" : "schedule";

        return {
          id: `${kind}-${row.id}`,
          scheduleId: row.id,
          workReqId: row.work_req_id ?? null,
          employeeId: row.employee_id ?? null,
          date: toLocalDateKey(start),
          title:
            row.title ||
            (kind === "custom" ? "Calendar event" : "Scheduled stop"),
          details: row.details || "",
          audience_level: row.audience_level || "technician",
          employeeName:
            row.employee_name ||
            (kind === "custom" ? "Shared event" : "Unassigned"),
          account: row.account || null,
          startLabel: formatEventTimeLabel(row.start_time),
          endLabel: formatEventTimeLabel(row.end_time),
          kind,
          start_time: row.start_time,
          end_time: row.end_time,
          // Joined work_req metadata from the schedule.js LEFT JOIN.
          // Null for custom events (no work_req_id).
          workReqReference: row.work_req_reference || null,
          workReqStatus: row.work_req_status || null,
          workReqMondayItemId: row.work_req_monday_item_id || null,
          workReqMondaySyncedAt: row.work_req_monday_synced_at || null,
        };
      });
  } catch (err) {
    console.warn("[calendar] Failed to load schedule:", err);
    return [];
  }
}

async function fetchDueTaskRows(from, to) {
  try {
    const [tasksResponse, employeesResponse] = await Promise.all([
      fetchApi("/tasks?scope=assignment", { cache: "no-store" }),
      fetchApi("/employees", { cache: "no-store" }),
    ]);

    const tasks = Array.isArray(tasksResponse)
      ? tasksResponse
      : tasksResponse?.data || [];
    const employees = Array.isArray(employeesResponse)
      ? employeesResponse
      : employeesResponse?.data || [];
    const employeeNames = new Map(
      employees.map((employee) => [
        Number(employee.id),
        employee.name || `Employee ${employee.id}`,
      ]),
    );

    return tasks
      .filter((task) => {
        const dueDate = String(
          task.due_date ?? task.dueDate ?? task.date ?? "",
        ).slice(0, 10);
        const assignedTo = Number(task.assigned_to ?? task.assignedTo);
        return dueDate && dueDate >= from && dueDate <= to && assignedTo;
      })
      .map((task) => {
        const dueDate = String(
          task.due_date ?? task.dueDate ?? task.date,
        ).slice(0, 10);
        const assignedTo = Number(task.assigned_to ?? task.assignedTo);

        return {
          id: `due-${task.id}`,
          scheduleId: null,
          workReqId: task.id,
          employeeId: assignedTo,
          date: dueDate,
          title: task.title || task.actionRequired || "Assigned request",
          details: "",
          audience_level: "technician",
          employeeName: employeeNames.get(assignedTo) || "Assigned employee",
          account: task.account || null,
          startLabel: "Due",
          endLabel: formatDateLabel(dueDate),
          kind: "due",
          start_time: null,
          end_time: null,
        };
      });
  } catch (err) {
    console.warn("[calendar] Failed to load due tasks:", err);
    return [];
  }
}

function countBy(items, selector) {
  const map = new Map();
  items.forEach((item) => {
    const key = selector(item) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupByAssignee(items) {
  const groups = new Map();

  items.forEach((item) => {
    const key = item.employeeName || "Unassigned";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return Array.from(groups.entries()).map(([employeeName, entries]) => ({
    employeeName,
    entries,
  }));
}

export default function Page() {
  const router = useRouter();
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [tasksByDay, setTasksByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(y, m), [y, m]);
  const range = useMemo(
    () => ({ from: grid[0].key, to: grid[grid.length - 1].key }),
    [grid],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meData, employeesData] = await Promise.all([
          fetchApi("/auth/me", { cache: "no-store" }),
          fetchApi("/employees", { cache: "no-store" }),
        ]);

        if (!cancelled) {
          setCurrentUser(meData?.data || meData || null);
          setEmployees(
            Array.isArray(employeesData)
              ? employeesData
              : employeesData?.data || [],
          );
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
          setEmployees([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let abort = false;

    (async () => {
      setLoading(true);
      setError("");

      const [scheduleRows, dueTaskRows] = await Promise.all([
        fetchScheduleRows(range.from, range.to),
        fetchDueTaskRows(range.from, range.to),
      ]);

      if (abort) {
        return;
      }

      const mergedRows = [...scheduleRows];
      const seen = new Set(
        scheduleRows
          .filter((row) => row.workReqId)
          .map((row) => `${row.workReqId}:${row.date}`),
      );

      dueTaskRows.forEach((row) => {
        const dedupeKey = row.workReqId
          ? `${row.workReqId}:${row.date}`
          : row.id;
        if (!seen.has(dedupeKey)) {
          mergedRows.push(row);
        }
      });

      const map = {};
      for (const task of mergedRows) {
        (map[task.date] ??= []).push(task);
      }

      Object.keys(map).forEach((key) => {
        map[key].sort((a, b) => {
          const order = { schedule: 0, custom: 1, due: 2 };
          const rankA = order[a.kind] ?? 99;
          const rankB = order[b.kind] ?? 99;
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          return a.startLabel.localeCompare(b.startLabel);
        });
      });

      setTasksByDay(map);
      setLoading(false);
    })().catch((err) => {
      if (!abort) {
        setError(err?.message || "Failed to load schedule");
        setLoading(false);
      }
    });

    return () => {
      abort = true;
    };
  }, [range.from, range.to, reloadKey]);

  useEffect(() => {
    const stillVisible = grid.find(
      (cell) => cell.key === selectedDayKey && cell.inMonth,
    );
    if (!stillVisible) {
      const firstInMonth = grid.find((cell) => cell.inMonth);
      if (firstInMonth) {
        setSelectedDayKey(firstInMonth.key);
      }
    }
  }, [grid, selectedDayKey]);

  const selectedTasks = tasksByDay[selectedDayKey] ?? [];
  const selectedDate = fromYmd(selectedDayKey);
  const selectedWeekday = selectedDate.toLocaleString(undefined, {
    weekday: "long",
  });
  const selectedGroups = groupByAssignee(selectedTasks);
  const todaysCoverage = countBy(
    tasksByDay[todayKey] ?? [],
    (item) => item.employeeName,
  ).slice(0, 4);
  const adminCanManageEvents = canManageEvents(currentUser);

  const goPrev = () => setCursor(new Date(y, m - 1, 1));
  const goNext = () => setCursor(new Date(y, m + 1, 1));
  const goToday = () => {
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(todayKey);
  };

  function handleDaySelect(cell) {
    setSelectedDayKey(cell.key);

    if (!cell.inMonth) {
      setCursor(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
  }

  function openCreateEventModal() {
    const baseDate = fromYmd(selectedDayKey);
    baseDate.setHours(9, 0, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setHours(10, 0, 0, 0);

    setEventError("");
    setEventForm({
      ...emptyEventForm,
      start_time: toDateTimeLocalValue(baseDate),
      end_time: toDateTimeLocalValue(endDate),
    });
    setEventModalOpen(true);
  }

  function openEditEventModal(event) {
    setEventError("");
    setEventForm(buildEventForm(event));
    setEventModalOpen(true);
  }

  function closeEventModal() {
    setEventModalOpen(false);
    setEventSaving(false);
    setEventError("");
    setEventForm(emptyEventForm);
  }

  async function saveEvent() {
    setEventSaving(true);
    setEventError("");

    try {
      const payload = {
        title: eventForm.title,
        details: eventForm.details,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time,
        audience_level: eventForm.audience_level,
        employee_id: eventForm.employee_id || null,
      };

      if (eventForm.id) {
        await fetchApi(`/schedule/${eventForm.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await fetchApi("/schedule", {
          method: "POST",
          body: payload,
        });
      }

      closeEventModal();
      setReloadKey((value) => value + 1);
    } catch (err) {
      setEventError(err.message || "Failed to save event.");
      setEventSaving(false);
    }
  }

  async function deleteEvent() {
    if (!eventForm.id) {
      return;
    }

    setEventSaving(true);
    setEventError("");

    try {
      await fetchApi(`/schedule/${eventForm.id}`, { method: "DELETE" });
      closeEventModal();
      setReloadKey((value) => value + 1);
    } catch (err) {
      setEventError(err.message || "Failed to delete event.");
      setEventSaving(false);
    }
  }

  useEffect(() => {
    if (!eventModalOpen) return;
    function handleEsc(e) {
      if (e.key === "Escape") closeEventModal();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [eventModalOpen]);

  return (
    <section className="space-y-6 p-6">
      <WorkspaceHeader
        eyebrow="Schedule Workspace"
        title="Schedule board"
        description="Review daily coverage, scan assignee load, and open linked requests."
        stats={[
          {
            label: "events in view",
            value: Object.values(tasksByDay).flat().length,
          },
          { label: "events on selected day", value: selectedTasks.length },
          { label: "assignees today", value: todaysCoverage.length },
        ]}
      />

      <WorkspaceToolbar
        left={
          <>
            <div className="theme-panel-muted inline-flex items-center gap-1 rounded-full border p-1 shadow-soft">
              <button
                aria-label="Previous month"
                onClick={goPrev}
                className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                ←
              </button>
              <div className="px-3 text-sm font-semibold text-foreground">
                {monthLabel(y, m)}
              </div>
              <button
                aria-label="Next month"
                onClick={goNext}
                className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                →
              </button>
            </div>
            <div className="theme-copy text-sm">
              {selectedWeekday} • {selectedDayKey}
            </div>
          </>
        }
        right={
          <button
            onClick={goToday}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Jump to today
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-card border border-border-soft bg-surface p-3 md:p-5 shadow-soft">
          <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-xs md:text-sm font-medium theme-copy">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px md:gap-1">
            {grid.map((cell) => {
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDayKey;
              const count = tasksByDay[cell.key]?.length ?? 0;

              return (
                <button
                  key={cell.key}
                  onClick={() => handleDaySelect(cell)}
                  className={[
                    "relative aspect-square rounded-md p-1 md:p-2 text-left outline-none ring-brand/40 transition",
                    cell.inMonth
                      ? "bg-surface-warm hover:bg-surface-muted"
                      : "bg-surface-warm-alt text-gray-600",
                    isSelected ? "ring-2" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={[
                        "text-xs md:text-sm",
                        cell.inMonth ? "theme-title" : "theme-copy opacity-60",
                      ].join(" ")}
                    >
                      {cell.date.getDate()}
                    </span>
                    {isToday ? (
                      <>
                        <span className="md:hidden h-1.5 w-1.5 rounded-full bg-brand-600" />
                        <span className="hidden md:inline rounded-full bg-brand-600 px-1.5 text-[10px] font-medium text-white">
                          Today
                        </span>
                      </>
                    ) : null}
                  </div>

                  {count > 0 ? (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                      {count <= 3 ? (
                        [...Array(count)].map((_, index) => (
                          <span
                            key={index}
                            className="h-1.5 w-1.5 rounded-full bg-brand-700"
                          />
                        ))
                      ) : (
                        <span className="rounded-full bg-brand-700 px-1.5 text-[10px] font-medium text-white">
                          {count}
                        </span>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mt-3 text-sm theme-copy">Loading schedule...</div>
          ) : null}
          {error ? (
            <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-black text-foreground">
              Daily agenda · {selectedWeekday}
            </h2>
            <p className="theme-copy mt-1 text-sm">Grouped by assignee.</p>

            {selectedGroups.length === 0 ? (
              <p className="theme-copy mt-4 text-sm">
                No schedule entries for this day.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {selectedGroups.map((group) => (
                  <div
                    key={group.employeeName}
                    className="rounded-xl border border-border-soft bg-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                        {group.employeeName}
                      </h3>
                      <span className="theme-copy text-sm font-medium">
                        {group.entries.length} item
                        {group.entries.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-border-soft bg-white px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 font-semibold text-foreground">
                              {entry.title}
                            </div>
                            {entry.workReqId ? (
                              <SyncStatusBadge
                                mondayItemId={entry.workReqMondayItemId}
                                mondaySyncedAt={entry.workReqMondaySyncedAt}
                                size="sm"
                              />
                            ) : null}
                          </div>
                          {entry.workReqReference ? (
                            <div className="mt-1 inline-block rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
                              {entry.workReqReference}
                              {entry.workReqStatus
                                ? ` · ${formatWorkReqStatus(entry.workReqStatus)}`
                                : ""}
                            </div>
                          ) : null}
                          <div className="mt-1 text-sm text-gray-600">
                            {entry.startLabel} - {entry.endLabel}
                            {entry.account ? ` • ${entry.account}` : ""}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {entry.workReqId ? (
                              <button
                                onClick={() =>
                                  router.push(`/req/${entry.workReqId}`)
                                }
                                className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              >
                                Open request
                              </button>
                            ) : null}

                            {adminCanManageEvents && entry.kind === "custom" ? (
                              <button
                                onClick={() => openEditEventModal(entry)}
                                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold theme-title ring-1 ring-border-soft hover:bg-surface-muted"
                              >
                                Edit event
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
            <h3 className="text-lg font-bold text-foreground">
              Today’s coverage
            </h3>
            {todaysCoverage.length === 0 ? (
              <p className="theme-copy mt-3 text-sm">
                No technicians are scheduled today.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {todaysCoverage.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
                  >
                    <div className="font-medium text-foreground">
                      {item.label}
                    </div>
                    <div className="text-sm font-semibold text-gray-600">
                      {item.value} stop{item.value === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {eventModalOpen ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-6"
          onClick={closeEventModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            className="theme-panel w-full max-w-2xl rounded-3xl border border-border-soft p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="theme-tag inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                  Custom event
                </div>
                <h3
                  id="event-modal-title"
                  className="theme-title mt-3 text-2xl font-black"
                >
                  {eventForm.id ? "Edit calendar event" : "Add calendar event"}
                </h3>
                <p className="theme-copy mt-2 text-sm">
                  Create standalone schedule items like meetings, celebrations,
                  and team reminders.
                </p>
              </div>
              <button
                onClick={closeEventModal}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold theme-title ring-1 ring-border-soft hover:bg-surface-muted"
              >
                Close
              </button>
            </div>

            {eventError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
                {eventError}
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-bold theme-title">
                  Event title
                </span>
                <input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                  placeholder="Admin meeting, summer party, warehouse walkthrough..."
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-bold theme-title">
                  Start time
                </span>
                <input
                  type="datetime-local"
                  value={eventForm.start_time}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      start_time: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-bold theme-title">End time</span>
                <input
                  type="datetime-local"
                  value={eventForm.end_time}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      end_time: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-bold theme-title">
                  Visible to
                </span>
                <select
                  value={eventForm.audience_level}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      audience_level: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                >
                  <option value="technician">Everyone</option>
                  <option value="manager">Managers and admins</option>
                  <option value="admin">Admins only</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-bold theme-title">
                  Assigned person
                </span>
                <select
                  value={eventForm.employee_id}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      employee_id: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                >
                  <option value="">No assignee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-bold theme-title">Details</span>
                <textarea
                  value={eventForm.details}
                  onChange={(e) =>
                    setEventForm((current) => ({
                      ...current,
                      details: e.target.value,
                    }))
                  }
                  rows={4}
                  className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm"
                  placeholder="Optional notes for the event..."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <div>
                {eventForm.id ? (
                  <button
                    onClick={deleteEvent}
                    disabled={eventSaving}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Delete event
                  </button>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeEventModal}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold theme-title ring-1 ring-border-soft hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEvent}
                  disabled={eventSaving}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {eventSaving
                    ? "Saving..."
                    : eventForm.id
                      ? "Save changes"
                      : "Create event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
