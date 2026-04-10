"use client";

import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import { fetchApi } from "@/lib/api/api";
import {
  formatDateLabel,
  getMaxDueDateInputValue,
  getTodayDateInputValue,
  validateDueDateRange,
} from "@/lib/inputSafety";
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

function getEmployeeInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

export default function AssignmentsPage() {
  const minDueDate = getTodayDateInputValue();
  const maxDueDate = getMaxDueDateInputValue();
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

    return tasks.filter((task) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "unassigned"
            ? !task.assignedTo
            : !!task.assignedTo;

      const haystack = [task.title, task.referenceNumber, task.account, task.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!term || haystack.includes(term));
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

  const selectedEmployee = employees.find((employee) => Number(employee.id) === Number(selectedEmployeeId));
  const dueDateError = dueDate ? validateDueDateRange(dueDate, { min: minDueDate, max: maxDueDate }) : "";
  const selectedCount = selectedTaskIds.size;
  const canAssign = selectedCount > 0 && selectedEmployeeId && dueDate && !dueDateError && !submitting;
  const unassignedVisibleCount = filteredTasks.filter((task) => !task.assignedTo).length;
  const selectedTasks = tasks.filter((task) => selectedTaskIds.has(task.id));
  const topEmployees = groupedByEmployee
    .slice()
    .sort((a, b) => b.tasks.length - a.tasks.length)
    .slice(0, 4);

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

    if (dueDateError) {
      setMessage(dueDateError);
      return;
    }

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
        <WorkspaceHeader
          eyebrow="Scheduling Workspace"
          title="Assign Work Intentionally"
          description="Pair open requests with the right employee and due date."
          stats={[
            { label: "employees loaded", value: employees.length },
            { label: "tasks in scope", value: tasks.length },
            { label: "selected", value: selectedCount },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1.45fr]">
          <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="theme-copy text-[11px] uppercase tracking-[0.22em]">Assignment Command</div>
                <h2 className="theme-title mt-1 text-xl font-black">Build the assignment</h2>
              </div>
              <div className="theme-panel-muted rounded-full px-4 py-2 text-sm font-semibold theme-title">
                {selectedCount} selected
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium theme-copy">Employee</label>
                <select
                  className="mt-2 w-full rounded-xl border border-border-soft bg-white p-3 theme-copy shadow-soft"
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

              {topEmployees.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {topEmployees.map(({ employee, tasks: employeeTasks }) => {
                    const active = Number(employee.id) === Number(selectedEmployeeId);
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(String(employee.id))}
                        className={clsx(
                          "rounded-2xl border p-4 text-left transition shadow-soft",
                          active
                            ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-300/40"
                            : "theme-panel hover:border-emerald-300 hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-black theme-title ring-1 ring-border-soft">
                            {getEmployeeInitials(employee.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate theme-title font-semibold">{employee.name}</div>
                            <div className="theme-copy text-sm">
                              {employee.role || "Team member"} - {employeeTasks.length} active
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium theme-copy">Due date</label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border border-border-soft bg-white p-3 theme-copy shadow-soft"
                  value={dueDate}
                  min={minDueDate}
                  max={maxDueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <p className="mt-2 text-xs theme-copy">
                  Dates must stay between today and one year out so the board stays realistic.
                </p>
              </div>

              <div className="theme-panel-muted rounded-2xl border border-border-soft p-4 shadow-soft">
                <div className="theme-copy text-[11px] uppercase tracking-[0.22em]">Assignment preview</div>
                <div className="mt-2 theme-title text-lg font-black">
                  {selectedCount > 0 ? `${selectedCount} request${selectedCount === 1 ? "" : "s"}` : "Select requests"}
                </div>
                <div className="mt-1 text-sm theme-copy">
                  {selectedEmployee ? `Assigning to ${selectedEmployee.name}` : "Choose an employee"}
                  {dueDate ? ` on ${formatDateLabel(dueDate)}` : " and set a due date"}
                </div>

                {selectedTasks.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {selectedTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="theme-panel flex items-center justify-between rounded-xl border border-border-soft px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate theme-title text-sm font-semibold">{task.title}</div>
                          <div className="truncate theme-copy text-xs">
                            {[task.account, task.location].filter(Boolean).join(" • ") || "No account or location"}
                          </div>
                        </div>
                        <div className="theme-copy text-xs">{task.referenceNumber || `REQ-${task.id}`}</div>
                      </div>
                    ))}
                    {selectedTasks.length > 3 ? (
                      <div className="theme-copy text-xs">+ {selectedTasks.length - 3} more selected</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <button
                onClick={assignTasks}
                disabled={!canAssign}
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition",
                  canAssign ? "bg-emerald-600 hover:bg-emerald-500" : "bg-emerald-300"
                )}
              >
                {submitting ? "Assigning..." : `Assign ${selectedCount > 0 ? `(${selectedCount})` : ""}`}
              </button>

              <div className={clsx("text-sm", dueDateError ? "text-red-500" : "theme-copy")}>
                {dueDateError || message || "Pick an employee, choose requests, and send them to the schedule."}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <WorkspaceToolbar
                left={
                  <div className="inline-flex flex-nowrap gap-1 rounded-full theme-panel-muted p-1 shadow-soft">
                    {["unassigned", "assigned", "all"].map((key) => (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={clsx(
                          "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
                          filter === key ? "bg-white theme-title shadow-soft" : "theme-copy"
                        )}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                }
                right={
                  <>
                    <div className="theme-panel-muted rounded-full px-4 py-2 text-sm font-semibold theme-title">
                      {filteredTasks.length} in view
                    </div>
                    <div className="theme-panel-muted rounded-full px-4 py-2 text-sm font-semibold theme-title">
                      {unassignedVisibleCount} ready
                    </div>
                    <input
                      placeholder="Search tasks..."
                      className="w-full rounded-xl border border-border-soft bg-white p-2.5 theme-copy shadow-soft md:w-56"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      onClick={selectAllOnPage}
                      className="theme-panel-muted rounded-xl px-3 py-2 text-sm font-semibold theme-title transition hover:opacity-90"
                    >
                      Select all
                    </button>
                    <button
                      onClick={clearAll}
                      className="theme-panel-muted rounded-xl px-3 py-2 text-sm font-semibold theme-title transition hover:opacity-90"
                    >
                      Clear
                    </button>
                  </>
                }
              />

              {loading ? (
                <div className="text-sm theme-copy">Loading...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="theme-panel-muted rounded-2xl border border-border-soft p-5 text-sm theme-copy">
                  No tasks match the filters.
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filteredTasks.map((task) => {
                    const checked = selectedTaskIds.has(task.id);
                    const disabled = !!task.assignedTo && Number(task.assignedTo) !== Number(selectedEmployeeId || 0);
                    const assignedEmployeeName =
                      employees.find((employee) => Number(employee.id) === Number(task.assignedTo))?.name || task.assignedTo;

                    return (
                      <li
                        key={task.id}
                        className={clsx(
                          "rounded-3xl border p-4 transition shadow-soft",
                          checked
                            ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-300/40"
                            : "theme-panel border-border-soft hover:border-emerald-300 hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <label className="flex flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSelect(task.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-semibold theme-title">{task.title}</div>
                                {task.referenceNumber ? (
                                  <div className="theme-panel-muted rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] theme-copy">
                                    {task.referenceNumber}
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-2 text-sm theme-copy">
                                {[task.account, task.location].filter(Boolean).join(" • ") || "No account or location"}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {task.assignedTo ? (
                                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                                    {assignedEmployeeName}
                                    {task.date ? ` • due ${formatDateLabel(task.date)}` : ""}
                                  </div>
                                ) : (
                                  <div className="theme-panel-muted rounded-full px-3 py-1 text-xs font-semibold theme-title">
                                    Ready to assign
                                  </div>
                                )}
                                {task.date ? (
                                  <div className="theme-panel-muted rounded-full px-3 py-1 text-xs font-semibold theme-copy">
                                    Due {formatDateLabel(task.date)}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </label>

                          {!!task.assignedTo && (
                            <button
                              onClick={() => unassignTask(task.id)}
                              className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold theme-copy ring-1 ring-border-soft transition hover:opacity-90"
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

            <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black theme-title">Current Assignments</h2>
                <div className="theme-panel-muted rounded-full px-4 py-2 text-sm font-semibold theme-title">
                  {tasks.filter((task) => task.assignedTo).length} active
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {groupedByEmployee.map(({ employee, tasks: employeeTasks }) => (
                  <div key={employee.id} className="theme-panel rounded-2xl border border-border-soft p-4 shadow-soft">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-black theme-title ring-1 ring-border-soft">
                        {getEmployeeInitials(employee.name)}
                      </div>
                      <div>
                        <div className="font-semibold theme-title">
                          {employee.name} {employee.role ? `- ${employee.role}` : ""}
                        </div>
                        <div className="theme-copy text-sm">
                          {employeeTasks.length} active assignment{employeeTasks.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    {employeeTasks.length === 0 ? (
                      <div className="text-sm theme-copy">No tasks.</div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {employeeTasks.map((task) => (
                          <li key={task.id} className="theme-panel-muted flex items-center justify-between gap-3 rounded-xl p-3">
                            <div className="min-w-0">
                              <div className="truncate theme-title">{task.title}</div>
                              <div className="theme-copy">{task.date ? `Due ${formatDateLabel(task.date)}` : ""}</div>
                            </div>
                            <button
                              onClick={() => unassignTask(task.id)}
                              className="rounded-md bg-white px-2 py-1 text-xs font-semibold theme-copy ring-1 ring-border-soft transition hover:opacity-90"
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
        </div>
      </section>
    </AppShell>
  );
}
