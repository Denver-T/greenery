"use client";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";
import { useEffect, useMemo, useState } from "react";

function clsx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeTask(task) {
  return {
    ...task,
    title: task.title || task.actionRequired || "Untitled task",
    account: task.account || "",
    location: task.location || "",
    assignedTo: task.assignedTo ?? task.assigned_to ?? null,
    date: task.date ?? task.dueDate ?? task.due_date ?? null,
  };
}

export default function AssignmentsPage() {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [filter, setFilter] = useState("unassigned");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [employeesData, tasksData] = await Promise.all([
        fetchApi("/employees", { cache: "no-store" }),
        fetchApi("/tasks?scope=assignment", { cache: "no-store" }),
      ]);

      const employeeRows = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
      const taskRows = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];
      setEmployees(employeeRows);
      setTasks(taskRows.map(normalizeTask));
    } catch (e) {
      console.error("[assignments] load failed", e);
      setMessage(e.message || "Failed to load assignments data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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

      const haystack = [t.title, t.referenceNumber, t.account, t.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [tasks, filter, search]);

  const groupedByEmployee = useMemo(() => {
    const map = new Map();
    employees.forEach((employee) => {
      map.set(Number(employee.id), { employee, tasks: [] });
    });

    tasks.forEach((task) => {
      const assignedId = Number(task.assignedTo);
      if (assignedId && map.has(assignedId)) {
        map.get(assignedId).tasks.push(task);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      (a.employee.name || "").localeCompare(b.employee.name || "")
    );
  }, [employees, tasks]);

  const selectedCount = selectedTaskIds.size;
  const canAssign = selectedCount > 0 && selectedEmployeeId && dueDate && !submitting;

  function toggleSelect(id) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllOnPage() {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      filteredTasks.forEach((task) => {
        if (!task.assignedTo) {
          next.add(task.id);
        }
      });
      return next;
    });
  }

  function clearAll() {
    setSelectedTaskIds(new Set());
  }

  async function assignTasks() {
    const taskIds = Array.from(selectedTaskIds);
    setSubmitting(true);
    setMessage("");

    try {
      await Promise.all(
        taskIds.map((taskId) =>
          fetchApi(`/tasks/${taskId}/assign`, {
            method: "PATCH",
            body: {
              assigned_to: Number(selectedEmployeeId),
              due_date: dueDate,
            },
          })
        )
      );

      await loadData();
      clearAll();

      const employee = employees.find((item) => Number(item.id) === Number(selectedEmployeeId));
      setMessage(
        `Assigned ${taskIds.length} task${taskIds.length === 1 ? "" : "s"} to ${employee?.name || "employee"}.`
      );
    } catch (e) {
      setMessage(e.message || "Assignment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function unassignTask(taskId) {
    try {
      await fetchApi(`/tasks/${taskId}/assign`, {
        method: "PATCH",
        body: {
          assigned_to: null,
          due_date: null,
        },
      });

      await loadData();
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } catch (e) {
      console.error(e);
      setMessage(e.message || "Failed to unassign task.");
    }
  }

  return (
    <AppShell title="Assign Tasks">
      <section className="space-y-6 p-6">
        <div className="bg-white p-4 shadow-soft">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Employee</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white p-2"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">Select employee...</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} {employee.role ? `- ${employee.role}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Due date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 p-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Stored on the work request so the calendar and task list can use it.
              </p>
            </div>

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

              <div className="text-xs text-gray-600">{message}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 shadow-soft">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex gap-1 rounded-md bg-gray-100 p-1">
              {["unassigned", "assigned", "all"].map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={clsx(
                    "rounded px-3 py-1.5 text-sm capitalize",
                    filter === key ? "bg-white text-emerald-700 shadow" : "text-gray-700"
                  )}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                placeholder="Search tasks..."
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
            <div className="text-sm text-gray-500">Loading...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-sm text-gray-500">No tasks match the filters.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => {
                const checked = selectedTaskIds.has(task.id);
                const disabled = !!task.assignedTo && Number(task.assignedTo) !== Number(selectedEmployeeId || 0);

                return (
                  <li key={task.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSelect(task.id)}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-600">
                            {[task.account, task.location].filter(Boolean).join(" - ") || "No account/location"}
                          </div>

                          {task.assignedTo ? (
                            <div className="mt-1 text-xs text-emerald-700">
                              Assigned to {employees.find((employee) => Number(employee.id) === Number(task.assignedTo))?.name || task.assignedTo}
                              {task.date ? ` - due ${task.date}` : ""}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-gray-500">Unassigned</div>
                          )}
                        </div>
                      </div>

                      {!!task.assignedTo && (
                        <button
                          onClick={() => unassignTask(task.id)}
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

        <div className="bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Current Assignments</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {groupedByEmployee.map(({ employee, tasks: employeeTasks }) => (
              <div key={employee.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 font-medium text-gray-900">
                  {employee.name} {employee.role ? `- ${employee.role}` : ""}
                </div>

                {employeeTasks.length === 0 ? (
                  <div className="text-sm text-gray-500">No tasks.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {employeeTasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-gray-900">{task.title}</div>
                          <div className="text-gray-500">{task.date ? `due ${task.date}` : ""}</div>
                        </div>
                        <button
                          onClick={() => unassignTask(task.id)}
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
