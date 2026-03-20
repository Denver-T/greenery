"use client";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";
import { useEffect, useMemo, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");
const toLocalDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const monthLabel = (y, mZero) =>
  new Date(y, mZero, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

function buildMonthGrid(year, monthZero) {
  const first = new Date(year, monthZero, 1);
  const startDow = first.getDay();
  const gridStart = new Date(year, monthZero, 1 - startDow);
  const cells = [];

  for (let i = 0; i < 42; i++) {
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

function normalizeCalendarTask(task, employeeMap) {
  const date = task.dueDate || task.due_date || task.date;
  const assignedId = task.assignedTo ?? task.assigned_to ?? null;
  return {
    id: String(task.id),
    date: date ? String(date).slice(0, 10) : null,
    title: task.title || "Untitled task",
    account: task.account || "",
    location: task.location || "",
    notes: task.notes || "",
    status: task.status || "",
    assignedTo: assignedId,
    assignee: assignedId ? employeeMap.get(Number(assignedId)) || `Employee ${assignedId}` : "Unassigned",
  };
}

async function fetchMonthTasks(from, to) {
  const [tasks, employees] = await Promise.all([
    fetchApi("/tasks?scope=assignment", { cache: "no-store" }),
    fetchApi("/employees", { cache: "no-store" }),
  ]);

  const employeeMap = new Map(
    (Array.isArray(employees) ? employees : []).map((employee) => [Number(employee.id), employee.name])
  );

  return (Array.isArray(tasks) ? tasks : [])
    .map((task) => normalizeCalendarTask(task, employeeMap))
    .filter((task) => task.date && task.date >= from && task.date <= to && task.assignedTo);
}

export default function Page() {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [tasksByDay, setTasksByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(y, m), [y, m]);
  const range = useMemo(() => ({ from: grid[0].key, to: grid[grid.length - 1].key }), [grid]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchMonthTasks(range.from, range.to);
        if (cancelled) {
          return;
        }

        const map = {};
        for (const task of rows) {
          (map[task.date] ??= []).push(task);
        }
        Object.keys(map).forEach((key) => {
          map[key].sort((a, b) => a.title.localeCompare(b.title));
        });

        setTasksByDay(map);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load tasks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
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

  const goPrev = () => setCursor(new Date(y, m - 1, 1));
  const goNext = () => setCursor(new Date(y, m + 1, 1));
  const goToday = () => {
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(todayKey);
  };

  return (
    <AppShell title="View Calendar">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-emerald-900">Schedule</h1>
          <button
            onClick={goToday}
            className="rounded-md bg-emerald-100 px-3 py-1.5 text-emerald-700 hover:bg-emerald-200"
          >
            Today
          </button>
        </div>

        <div className="rounded-card bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Previous month"
              onClick={goPrev}
              className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"
            >
              &lt;
            </button>
            <div className="text-lg font-medium text-gray-900">{monthLabel(y, m)}</div>
            <button
              aria-label="Next month"
              onClick={goNext}
              className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"
            >
              &gt;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-sm font-medium text-gray-500">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDayKey;
              const count = tasksByDay[cell.key]?.length ?? 0;

              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedDayKey(cell.key)}
                  className={[
                    "relative aspect-square rounded-md p-2 text-left outline-none ring-emerald-400 transition",
                    cell.inMonth ? "bg-gray-200 hover:bg-emerald-50" : "bg-gray-50 text-gray-600",
                    isSelected ? "ring-2" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <span className={["text-sm", cell.inMonth ? "text-gray-900" : "text-gray-400"].join(" ")}>
                      {cell.date.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-medium text-white">
                        Today
                      </span>
                    )}
                  </div>

                  {count > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                      {count <= 3 ? (
                        [...Array(count)].map((_, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        ))
                      ) : (
                        <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-medium text-white">
                          {count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {loading && <div className="mt-3 text-sm text-gray-500">Loading tasks...</div>}
          {!!error && <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="rounded-card bg-emerald-900/90 p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {selectedWeekday} - {selectedDayKey}
            </h2>
            <div className="text-sm text-emerald-100">
              Assigned tasks due on this day: {selectedTasks.length}
            </div>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-emerald-100">No assigned tasks scheduled for this day.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {selectedTasks.map((task) => (
                <li key={task.id} className="rounded-lg bg-white p-3 shadow">
                  <h3 className="mb-1 font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm font-medium text-emerald-700">Assigned to: {task.assignee}</p>

                  {(task.account || task.location) && (
                    <p className="mt-1 text-sm text-gray-600">
                      {task.account ? task.account : ""}
                      {task.account && task.location ? " - " : ""}
                      {task.location ? task.location : ""}
                    </p>
                  )}

                  {task.notes && <p className="mt-2 line-clamp-3 text-sm text-gray-700">{task.notes}</p>}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                      {task.status}
                    </span>
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      View Task
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedTask && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-brand-700">Task Details</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Info label="Task" value={selectedTask.title} />
                <Info label="Due Date" value={selectedTask.date} />
                <Info label="Assigned To" value={selectedTask.assignee} />
                <Info label="Status" value={selectedTask.status} />
                <Info label="Account" value={selectedTask.account} />
                <Info label="Location" value={selectedTask.location} />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
                  {selectedTask.notes || "No notes provided."}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value || "-"}</div>
    </div>
  );
}
