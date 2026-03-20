"use client";

import AppShell from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api/api";

const pad = (value) => String(value).padStart(2, "0");
const toLocalDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fromYmd = (ymd) => {
  const [year, month, day] = ymd.split("-").map((value) => parseInt(value, 10));
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const monthLabel = (year, monthZero) =>
  new Date(year, monthZero, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

function buildMonthGrid(year, monthZero) {
  const first = new Date(year, monthZero, 1);
  const startDow = first.getDay();
  const gridStart = new Date(year, monthZero, 1 - startDow);
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    date.setHours(0, 0, 0, 0);
    cells.push({
      date,
      inMonth: date.getMonth() === monthZero,
      key: toLocalDateKey(date),
    });
  }

  return cells;
}

async function fetchMonthTasks(from, to) {
  try {
    const tasks = await fetchApi("/tasks", { cache: "no-store" });
    const fromDate = fromYmd(from);
    const toDate = fromYmd(to);

    return (Array.isArray(tasks) ? tasks : []).filter((task) => {
      const dueDateValue = task.due_date ?? task.dueDate ?? null;
      if (!dueDateValue) {
        return false;
      }

      const dueDate = new Date(dueDateValue);
      if (Number.isNaN(dueDate.getTime())) {
        return false;
      }

      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= fromDate && dueDate <= toDate;
    });
  } catch (error) {
    console.warn("[calendar] Failed to load tasks:", error);
    return [];
  }
}

export default function Page() {
  const router = useRouter();
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [tasksByDay, setTasksByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const range = useMemo(
    () => ({
      from: grid[0].key,
      to: grid[grid.length - 1].key,
    }),
    [grid]
  );

  useEffect(() => {
    let abort = false;

    (async () => {
      setLoading(true);
      setError("");

      const rows = await fetchMonthTasks(range.from, range.to);
      if (abort) {
        return;
      }

      const map = {};
      for (const task of rows) {
        const dueDateValue = task.due_date ?? task.dueDate ?? null;
        if (!dueDateValue) {
          continue;
        }

        const dateKey = toLocalDateKey(new Date(dueDateValue));
        (map[dateKey] ??= []).push({
          ...task,
          date: dateKey,
        });
      }

      Object.keys(map).forEach((key) => {
        map[key].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
      });

      setTasksByDay(map);
      setLoading(false);
    })().catch((event) => {
      if (!abort) {
        setError(event?.message || "Failed to load tasks");
        setLoading(false);
      }
    });

    return () => {
      abort = true;
    };
  }, [range.from, range.to]);

  useEffect(() => {
    const stillVisible = grid.find((cell) => cell.key === selectedDayKey && cell.inMonth);
    if (!stillVisible) {
      const firstInMonth = grid.find((cell) => cell.inMonth);
      if (firstInMonth) {
        setSelectedDayKey(firstInMonth.key);
      }
    }
  }, [grid, selectedDayKey]);

  const selectedTasks = tasksByDay[selectedDayKey] ?? [];
  const selectedDate = fromYmd(selectedDayKey);
  const selectedWeekday = selectedDate.toLocaleString(undefined, { weekday: "long" });

  return (
    <AppShell title="View Calendar">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="app-badge mb-3">Calendar</div>
            <h1 className="app-title text-2xl">Schedule overview</h1>
            <p className="app-copy mt-2 text-sm">
              Review the month, inspect task counts by day, and jump into task details for selected dates.
            </p>
          </div>

          <button
            onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="app-button app-button-secondary"
          >
            Today
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="app-panel shadow-soft p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                aria-label="Previous month"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="app-button app-button-secondary px-3 py-2"
              >
                Prev
              </button>
              <div className="text-lg font-semibold text-foreground">{monthLabel(year, month)}</div>
              <button
                aria-label="Next month"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="app-button app-button-secondary px-3 py-2"
              >
                Next
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 px-1 pb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {grid.map((cell) => {
                const isToday = cell.key === todayKey;
                const isSelected = cell.key === selectedDayKey;
                const count = tasksByDay[cell.key]?.length ?? 0;

                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDayKey(cell.key)}
                    className={[
                      "relative aspect-square rounded-[18px] border p-2 text-left",
                      cell.inMonth
                        ? "border-border bg-surface-strong text-foreground hover:bg-surface-subtle"
                        : "border-border bg-surface-inset text-muted",
                      isSelected ? "ring-2 ring-brand/60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                      {isToday ? <span className="app-badge px-2 py-1 text-[10px]">Today</span> : null}
                    </div>

                    {count > 0 ? (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                        {count <= 3 ? (
                          [...Array(count)].map((_, index) => (
                            <span key={index} className="h-1.5 w-1.5 rounded-full bg-brand" />
                          ))
                        ) : (
                          <span className="app-badge px-2 py-1 text-[10px]">{count}</span>
                        )}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {loading ? <div className="mt-4 text-sm text-muted">Loading tasks...</div> : null}
            {error ? (
              <div className="mt-4 rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="app-panel shadow-soft p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="app-title text-xl">
                  {selectedWeekday} - {selectedDayKey}
                </h2>
                <p className="app-copy mt-1 text-sm">Daily task detail and quick navigation.</p>
              </div>
              <button
                onClick={() => router.push(`/req?dueDate=${selectedDayKey}`)}
                className="app-button app-button-primary"
              >
                Create REQ
              </button>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="app-inset p-4 text-sm text-muted-foreground">
                No tasks scheduled for this day.
              </div>
            ) : (
              <ul className="grid gap-3">
                {selectedTasks.map((task) => (
                  <li key={task.id} className="app-inset p-4">
                    <h3 className="font-semibold text-foreground">{task.title}</h3>

                    {(task.account || task.location) ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.account ? task.account : ""}
                        {task.account && task.location ? " - " : ""}
                        {task.location ? task.location : ""}
                      </p>
                    ) : null}

                    {task.assigned_employee_name ? (
                      <p className="mt-2 text-sm text-brand-700">
                        Assigned to {task.assigned_employee_name}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Unassigned</p>
                    )}

                    {(task.start || task.end || task.estimateMins) ? (
                      <p className="mt-2 text-sm text-muted">
                        {(task.start || task.end)
                          ? `${task.start ?? ""}${task.start && task.end ? "-" : ""}${task.end ?? ""}`
                          : ""}
                        {(task.start || task.end) && task.estimateMins ? " - " : ""}
                        {task.estimateMins ? `~${Math.round(task.estimateMins / 60)} hr` : ""}
                      </p>
                    ) : null}

                    {task.notes ? <p className="mt-2 text-sm text-foreground/85">{task.notes}</p> : null}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="app-button app-button-primary px-4 py-2 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/tasks/${task.id}/edit`)}
                        className="app-button app-button-secondary px-4 py-2 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
