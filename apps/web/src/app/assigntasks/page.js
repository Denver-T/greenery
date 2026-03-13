"use client";

import AppShell from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL; 

function clsx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function AssignmentsPage() {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [filter, setFilter] = useState("unassigned"); // 'unassigned' | 'assigned' | 'all'
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        // Fetch employees from your Express route
        const empRes = await fetch(`${API}/employees`, { credentials: "include" });
        const employeesData = await empRes.json();

        // Fetch tasks for assignment view (minimal fields + assignedTo/date)
        const taskRes = await fetch(`${API}/tasks?scope=assignment`, {
          credentials: "include",
        });
        const tasksData = await taskRes.json();

        if (!abort) {
          setEmployees(employeesData || []);
          setTasks(tasksData || []);
        }
      } catch (e) {
        if (!abort) {
          console.error("[assignments] load failed", e);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "unassigned"
          ? !t.assignedTo
          : !!t.assignedTo;
      const matchesSearch =
        !term ||
        (t.title?.toLowerCase().includes(term) ||
          t.account?.toLowerCase().includes(term) ||
          t.location?.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [tasks, filter, search]);

  const selectedCount = selectedTaskIds.size;
  const canAssign =
    selectedCount > 0 && selectedEmployeeId && dueDate && !submitting;

  const toggleSelect = (id) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      filteredTasks.forEach((t) => {
        if (!t.assignedTo) next.add(t.id); // only auto-select unassigned
      });
      return next;
    });
  };

  const clearAll = () => setSelectedTaskIds(new Set());

  const assignTasks = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const body = {
        employeeId: selectedEmployeeId,
        dueDate, // YYYY-MM-DD -> write to task.date so calendar sees it
        taskIds: Array.from(selectedTaskIds),
      };
      const res = await fetch(`${API}/tasks/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Assignment failed");
      }
      // refresh tasks list
      const refreshed = await fetch(`${API}/tasks?scope=assignment`, {
        credentials: "include",
      }).then((r) => r.json());
      setTasks(refreshed || []);
      clearAll();
      setMessage(
        `Assigned ${body.taskIds.length} task${body.taskIds.length > 1 ? "s" : ""} to ${
          employees.find((e) => e.id === selectedEmployeeId)?.name
        } for ${dueDate}.`
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const unassignTask = async (taskId) => {
    try {
      await fetch(`${API}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignedTo: null }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assignedTo: null } : t))
      );
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const groupedByEmployee = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => map.set(e.id, { employee: e, tasks: [] }));
    tasks.forEach((t) => {
      if (t.assignedTo && map.has(t.assignedTo)) {
        map.get(t.assignedTo).tasks.push(t);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.employee.name.localeCompare(b.employee.name)
    );
  }, [employees, tasks]);

  return (
    <AppShell title="Assign Tasks">
      <section className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-emerald-900">
            Assign Tasks to Employees
          </h1>
        </div>

        {/* Assignment card */}
        <div className="rounded-card bg-white p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Employee picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Employee</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} {e.role ? `— ${e.role}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Due date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 p-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Required. Saved to <code>task.date</code> so it appears on the Calendar. 
              </p>
            </div>

            {/* Bulk actions */}
            <div className="flex flex-col justify-end gap-2">
              <button
                onClick={assignTasks}
                disabled={!canAssign}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium text-white",
                  canAssign ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-300"
                )}
              >
                Assign {selectedCount > 0 ? `(${selectedCount})` : ""}
              </button>
              <div className="text-xs text-gray-600">
                {message && <div>{message}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Task selector */}
        <div className="rounded-card bg-white p-4 shadow-soft">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex gap-1 rounded-md bg-gray-100 p-1">
              {["unassigned", "assigned", "all"].map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={clsx(
                    "rounded px-3 py-1.5 text-sm capitalize",
                    filter === k ? "bg-white shadow text-emerald-700" : "text-gray-700"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Search tasks…"
                className="w-full rounded-md border border-gray-300 p-2 md:w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={selectAllOnPage}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"
              >
                Select all
              </button>
              <button
                onClick={clearAll}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-sm text-gray-500">No tasks match the filters.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((t) => {
                const checked = selectedTaskIds.has(t.id);
                const disabled = !!t.assignedTo && t.assignedTo !== selectedEmployeeId;
                return (
                  <li key={t.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSelect(t.id)}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{t.title}</div>
                          <div className="text-sm text-gray-600">
                            {[t.account, t.location].filter(Boolean).join(" · ")}
                          </div>
                          {t.assignedTo ? (
                            <div className="mt-1 text-xs text-emerald-700">
                              Assigned to{" "}
                              {employees.find((e) => e.id === t.assignedTo)?.name || t.assignedTo}
                              {t.date ? ` · due ${t.date}` : ""}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-gray-500">Unassigned</div>
                          )}
                        </div>
                      </div>
                      {!!t.assignedTo && (
                        <button
                          onClick={() => unassignTask(t.id)}
                          className="rounded-md bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                          title="Unassign"
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Snapshot: Tasks by employee */}
        <div className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Current Assignments</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {groupedByEmployee.map(({ employee, tasks }) => (
              <div key={employee.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 font-medium text-gray-900">
                  {employee.name} {employee.role ? `— ${employee.role}` : ""}
                </div>
                {tasks.length === 0 ? (
                  <div className="text-sm text-gray-500">No tasks.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-gray-900">{t.title}</div>
                          <div className="text-gray-500">{t.date ? `due ${t.date}` : ""}</div>
                        </div>
                        <button
                          onClick={() => unassignTask(t.id)}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                        >
                          Unassign
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}