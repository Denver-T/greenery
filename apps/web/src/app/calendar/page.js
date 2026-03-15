"use client";

import AppShell from "@/components/AppShell";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Expected API contract for easy DB wiring:
 *   GET /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   -> returns Task[] with:
 *      {
 *        id: string,
 *        date: "YYYY-MM-DD",   // local date key (no time)
 *        title: string,
 *        account?: string,
 *        location?: string,
 *        estimateMins?: number,
 *        start?: "HH:mm",
 *        end?: "HH:mm",
 *        notes?: string
 *      }
 */

/* ===========================
   Date helpers (TZ safe)
   =========================== */

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

/**
 * Build a fixed 6x7 grid starting on Sunday for a given month.
 */
function buildMonthGrid(year, monthZero) {
  const first = new Date(year, monthZero, 1);
  const startDow = first.getDay(); // 0 (Sun) .. 6 (Sat)
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

/**
 * Replace this with real API call when ready.
 * If there's no API yet, it returns [] and logs a helpful hint.
 */
async function fetchMonthTasks(from, to) {
  try {
    const res = await fetch(`/api/tasks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      // No API yet or error – keep UI functional.
      console.warn("[calendar] /api/tasks returned", res.status, "– showing empty schedule.");
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn("[calendar] Failed to load tasks:", err);
    return [];
  }
}

export default function Page() {
  const router = useRouter();
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  // Month cursor & selection
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  // Data state
  const [tasksByDay, setTasksByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(y, m), [y, m]);

  // Visible range (use entire grid so we can show leading/trailing month days with dots)
  const range = useMemo(
    () => ({ from: grid[0].key, to: grid[grid.length - 1].key }),
    [grid]
  );

  // Load tasks whenever the visible range changes
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError("");
      const rows = await fetchMonthTasks(range.from, range.to);
      if (abort) return;

      // Index tasks by date (YYYY-MM-DD)
      const map = {};
      for (const t of rows) {
        (map[t.date] ??= []).push(t);
      }
      // Sort tasks per day by start time if present
      Object.keys(map).forEach((k) =>
        map[k].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
      );

      setTasksByDay(map);
      setLoading(false);
    })().catch((e) => {
      if (!abort) {
        setError(e?.message || "Failed to load tasks");
        setLoading(false);
      }
    });
    return () => {
      abort = true;
    };
  }, [range.from, range.to]);

  // Keep selected day in-view on month change
  useEffect(() => {
    const stillVisible = grid.find((c) => c.key === selectedDayKey && c.inMonth);
    if (!stillVisible) {
      const firstInMonth = grid.find((c) => c.inMonth);
      if (firstInMonth) setSelectedDayKey(firstInMonth.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, m]);

  // Derived
  const selectedTasks = tasksByDay[selectedDayKey] ?? [];
  const selectedDate = fromYmd(selectedDayKey);
  const selectedWeekday = selectedDate.toLocaleString(undefined, { weekday: "long" });

  // Nav
  const goPrev = () => setCursor(new Date(y, m - 1, 1));
  const goNext = () => setCursor(new Date(y, m + 1, 1));
  const goToday = () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1));

  return (
    <AppShell title="View Calendar">
      <section className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-emerald-900">Schedule</h1>
          <button
            onClick={goToday}
            className="rounded-md bg-emerald-100 px-3 py-1.5 text-emerald-700 hover:bg-emerald-200"
          >
            Today
          </button>
        </div>

        {/* Calendar Card */}
        <div className="rounded-card bg-white p-4 shadow-soft">
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Previous month"
              onClick={goPrev}
              className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"
            >
              ←
            </button>
            <div className="text-lg font-medium text-gray-900">{monthLabel(y, m)}</div>
            <button
              aria-label="Next month"
              onClick={goNext}
              className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50"
            >
              →
            </button>
          </div>

          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-sm font-medium text-gray-500">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
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
                    <span className={[ "text-sm", cell.inMonth ? "text-gray-900" : "text-gray-400" ].join(" ")}>
                      {cell.date.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-medium text-white">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Task dots / counter */}
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

          {/* Inline states */}
          {loading && <div className="mt-3 text-sm text-gray-500">Loading tasks…</div>}
          {!!error && (
            <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Day Panel */}
        <div className="rounded-card bg-emerald-900/90 p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {selectedWeekday} — {selectedDayKey}
            </h2>

            <button
              onClick={() => router.push(`/tasks/new?date=${selectedDayKey}`)}
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-emerald-900 shadow hover:bg-gray-100"
            >
              <span>＋</span> Add Task
            </button>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-emerald-100">No tasks scheduled for this day.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {selectedTasks.map((t) => (
                <li key={t.id} className="rounded-lg bg-white p-3 shadow">
                  <h3 className="mb-1 font-medium text-gray-900">{t.title}</h3>

                  {(t.account || t.location) && (
                    <p className="text-sm text-gray-600">
                      {t.account ? t.account : ""}
                      {t.account && t.location ? " • " : ""}
                      {t.location ? t.location : ""}
                    </p>
                  )}

                  {(t.start || t.end || t.estimateMins) && (
                    <p className="mt-1 text-sm text-gray-600">
                      {(t.start || t.end) ? `${t.start ?? ""}${t.start && t.end ? "–" : ""}${t.end ?? ""}` : ""}
                      {(t.start || t.end) && t.estimateMins ? " • " : ""}
                      {t.estimateMins ? `~${Math.round(t.estimateMins / 60)} hr` : ""}
                    </p>
                  )}

                  {t.notes && <p className="mt-2 line-clamp-3 text-sm text-gray-700">{t.notes}</p>}

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/tasks/${t.id}`)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/tasks/${t.id}/edit`)}
                      className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}