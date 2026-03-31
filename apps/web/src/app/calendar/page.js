"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import { fetchApi } from "@/lib/api/api";

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

async function fetchScheduleRows(from, to) {
  try {
    const response = await fetchApi("/schedule");
    const rows = Array.isArray(response) ? response : response?.data || [];

    return rows
      .filter((row) => {
        const dateKey = toLocalDateKey(new Date(row.start_time));
        return dateKey >= from && dateKey <= to;
      })
      .map((row) => {
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);

        return {
          id: row.id,
          workReqId: row.work_req_id ?? null,
          date: toLocalDateKey(start),
          title: row.title || "Scheduled stop",
          employeeName: row.employee_name || "Unassigned",
          account: row.account || null,
          startLabel: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          endLabel: end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        };
      });
  } catch (err) {
    console.warn("[calendar] Failed to load schedule:", err);
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

  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [tasksByDay, setTasksByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(y, m), [y, m]);
  const range = useMemo(
    () => ({ from: grid[0].key, to: grid[grid.length - 1].key }),
    [grid]
  );

  useEffect(() => {
    let abort = false;

    (async () => {
      setLoading(true);
      setError("");
      const rows = await fetchScheduleRows(range.from, range.to);
      if (abort) {
        return;
      }

      const map = {};
      for (const task of rows) {
        (map[task.date] ??= []).push(task);
      }

      Object.keys(map).forEach((key) => {
        map[key].sort((a, b) => a.startLabel.localeCompare(b.startLabel));
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
  const selectedGroups = groupByAssignee(selectedTasks);
  const todaysCoverage = countBy(tasksByDay[todayKey] ?? [], (item) => item.employeeName).slice(0, 4);

  const goPrev = () => setCursor(new Date(y, m - 1, 1));
  const goNext = () => setCursor(new Date(y, m + 1, 1));
  const goToday = () => {
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(todayKey);
  };

  return (
    <AppShell title="View Calendar">
      <section className="space-y-6 p-6">
        <WorkspaceHeader
          eyebrow="Schedule Workspace"
          title="Schedule board"
          description="Review daily coverage, scan assignee load, and open linked requests."
          stats={[
            { label: "events in view", value: Object.values(tasksByDay).flat().length },
            { label: "events on selected day", value: selectedTasks.length },
            { label: "assignees today", value: todaysCoverage.length },
          ]}
        />

        <WorkspaceToolbar
          left={
            <>
              <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-soft">
                <button
                  aria-label="Previous month"
                  onClick={goPrev}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
                >
                  ←
                </button>
                <div className="px-3 text-sm font-semibold text-foreground">{monthLabel(y, m)}</div>
                <button
                  aria-label="Next month"
                  onClick={goNext}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
                >
                  →
                </button>
              </div>
              <div className="text-sm text-gray-600">{selectedWeekday} · {selectedDayKey}</div>
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
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
                      "relative aspect-square rounded-md p-2 text-left outline-none ring-brand/40 transition",
                      cell.inMonth ? "bg-surface-warm hover:bg-surface-muted" : "bg-surface-warm-alt text-gray-600",
                      isSelected ? "ring-2" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between">
                      <span className={["text-sm", cell.inMonth ? "text-gray-900" : "text-gray-400"].join(" ")}>
                        {cell.date.getDate()}
                      </span>
                      {isToday ? (
                        <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-medium text-white">
                          Today
                        </span>
                      ) : null}
                    </div>

                    {count > 0 ? (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                        {count <= 3 ? (
                          [...Array(count)].map((_, index) => (
                            <span key={index} className="h-1.5 w-1.5 rounded-full bg-brand-700" />
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

            {loading ? <div className="mt-3 text-sm text-gray-500">Loading schedule…</div> : null}
            {error ? (
              <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}
          </section>

          <div className="space-y-6">
            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h2 className="text-lg font-black text-foreground">
                Daily agenda · {selectedWeekday}
              </h2>
              <p className="mt-1 text-sm text-gray-600">Grouped by assignee.</p>

              {selectedGroups.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No schedule entries for this day.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {selectedGroups.map((group) => (
                    <div key={group.employeeName} className="rounded-xl border border-border-soft bg-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                          {group.employeeName}
                        </h3>
                        <span className="text-sm font-medium text-gray-600">
                          {group.entries.length} stop{group.entries.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="rounded-xl border border-border-soft bg-white px-4 py-3">
                            <div className="font-semibold text-foreground">{entry.title}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              {entry.startLabel} - {entry.endLabel}
                              {entry.account ? ` • ${entry.account}` : ""}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              {entry.workReqId ? (
                                <button
                                  onClick={() => router.push(`/tasks?open=${entry.workReqId}`)}
                                  className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-foreground"
                                >
                                  Open request
                                </button>
                              ) : (
                                <span className="text-sm text-gray-500">No linked request</span>
                              )}
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
              <h3 className="text-lg font-bold text-foreground">Today’s coverage</h3>
              {todaysCoverage.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">No technicians are scheduled today.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {todaysCoverage.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <div className="font-medium text-foreground">{item.label}</div>
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
      </section>
    </AppShell>
  );
}
