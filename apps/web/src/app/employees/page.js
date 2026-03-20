"use client";

/**
 * Employee management page.
 *
 * Data flow:
 *   Next.js UI -> calls apps/api (HTTP) -> apps/api talks to MySQL
 */

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";

const ROLE_OPTIONS = [
  { label: "Employee", value: "Employee" },
  { label: "Manager", value: "Manager" },
  { label: "Admin", value: "Admin" },
];

const STATUS_OPTIONS = ["Active", "Inactive"];

function normalizeRoleForForm(value) {
  const normalized = String(value || "").trim().toLowerCase();

  switch (normalized) {
    case "admin":
    case "administrator":
      return "Admin";
    case "manager":
      return "Manager";
    default:
      return "Employee";
  }
}

function toEmployeeForm(employee = {}) {
  return {
    ...employee,
    name: employee.name || "",
    role: normalizeRoleForForm(employee.role),
    email: employee.email || "",
    phone: employee.phone || "",
    status: employee.status || "Active",
    permissionLevel: normalizeRoleForForm(
      employee.permissionLevel || employee.role
    ),
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(toEmployeeForm());

  const [formErrors, setFormErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchApi("/employees", { cache: "no-store" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function validateEmployeeData(data) {
    const errors = {};

    if (!data.name || !data.name.trim()) {
      errors.name = "Name is required";
    } else if (data.name.trim().length > 30) {
      errors.name = "Name must be 30 characters or less";
    }

    if (data.email && data.email.trim()) {
      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.email = "Please enter a valid email address";
      } else if (data.email.length > 45) {
        errors.email = "Email must be 45 characters or less";
      }
    }

    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[0-9+()\-\.\s]{7,20}$/;
      if (!phoneRegex.test(data.phone.trim())) {
        errors.phone =
          "Please enter a valid phone number (e.g., (555) 555-5555 or 5555555555)";
      } else if (data.phone.length > 20) {
        errors.phone = "Phone must be 20 characters or less";
      }
    }

    return errors;
  }

  async function createEmployee() {
    const errors = validateEmployeeData(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      await fetchApi("/employees", {
        method: "POST",
        body: form,
      });

      setForm(toEmployeeForm());
      setFormErrors({});
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to create employee.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) {
      return;
    }

    const errors = validateEmployeeData(editing);
    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      await fetchApi(`/employees/${editing.id}`, {
        method: "PUT",
        body: editing,
      });
      setEditing(null);
      setEditErrors({});
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to update employee.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee(id) {
    if (!confirm("Delete this employee?")) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      await fetchApi(`/employees/${id}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to delete employee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Manage Employees">
      <div className="p-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-extrabold text-brand-700">
            Create New Employee
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Name</span>
              <input
                className={`rounded-xl border px-3 py-2 ${
                  formErrors.name ? "border-red-500" : "border-gray-200"
                }`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Magnus Mullen"
              />
              {formErrors.name && (
                <span className="text-xs text-red-600">{formErrors.name}</span>
              )}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Role</span>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Email</span>
              <input
                className={`rounded-xl border px-3 py-2 ${
                  formErrors.email ? "border-red-500" : "border-gray-200"
                }`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@greenery.ca"
              />
              {formErrors.email && (
                <span className="text-xs text-red-600">{formErrors.email}</span>
              )}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Phone</span>
              <input
                className={`rounded-xl border px-3 py-2 ${
                  formErrors.phone ? "border-red-500" : "border-gray-200"
                }`}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-555-5555"
              />
              {formErrors.phone && (
                <span className="text-xs text-red-600">{formErrors.phone}</span>
              )}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Status</span>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Permission Level</span>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.permissionLevel}
                onChange={(e) =>
                  setForm({ ...form, permissionLevel: e.target.value })
                }
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              className="rounded-xl bg-brand-700 px-4 py-2 font-extrabold text-white disabled:opacity-60"
              disabled={busy || !form.name.trim()}
              onClick={createEmployee}
            >
              {busy ? "Saving..." : "Create Employee"}
            </button>

            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-extrabold text-gray-800 disabled:opacity-60"
              disabled={busy}
              onClick={refresh}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-extrabold text-brand-700">
            All Employees
          </div>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-gray-600">No employees found.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="rounded-2xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-xl">
                      U
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-gray-900">
                        {emp.name}
                      </div>
                      <div className="text-sm font-bold text-gray-600">
                        {normalizeRoleForForm(emp.role)}
                      </div>
                      <div className="text-xs font-semibold text-gray-500">
                        ID: {emp.id}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm font-semibold text-gray-700">
                    <div>
                      Email: <span className="font-normal">{emp.email || "-"}</span>
                    </div>
                    <div>
                      Phone: <span className="font-normal">{emp.phone || "-"}</span>
                    </div>
                    <div>
                      Status: <span className="font-normal">{emp.status || "Active"}</span>
                    </div>
                    <div>
                      Permission: <span className="font-normal">{normalizeRoleForForm(emp.permissionLevel || emp.role)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 font-extrabold text-black disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        setEditing(toEmployeeForm(emp));
                        setEditErrors({});
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-extrabold text-red-700 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => deleteEmployee(emp.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editing ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
            onClick={() => setEditing(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-lg font-extrabold text-brand-700">
                Edit Employee
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Name</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${
                      editErrors.name ? "border-red-500" : "border-gray-200"
                    }`}
                    value={editing.name || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                  {editErrors.name && (
                    <span className="text-xs text-red-600">{editErrors.name}</span>
                  )}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Role</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.role || "Employee"}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Email</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${
                      editErrors.email ? "border-red-500" : "border-gray-200"
                    }`}
                    value={editing.email || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                  {editErrors.email && (
                    <span className="text-xs text-red-600">{editErrors.email}</span>
                  )}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Phone</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${
                      editErrors.phone ? "border-red-500" : "border-gray-200"
                    }`}
                    value={editing.phone || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                  {editErrors.phone && (
                    <span className="text-xs text-red-600">{editErrors.phone}</span>
                  )}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Status</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.status || "Active"}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Permission Level</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.permissionLevel || editing.role || "Employee"}
                    onChange={(e) =>
                      setEditing({ ...editing, permissionLevel: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-extrabold"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setEditErrors({});
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-brand-700 px-4 py-2 font-extrabold text-white disabled:opacity-60"
                  disabled={busy || !editing.name?.trim()}
                  onClick={saveEdit}
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
