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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    role: "Technician",
    email: "",
    phone: "",
    status: "Active",
    permissionLevel: "Technician",
  });

  const [formErrors, setFormErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  const isSuperAdmin = currentUser?.permissionLevel === "SuperAdmin";

  function getPermissionOptions(selectedValue = "Technician") {
    const base = ["Technician"];

    if (isSuperAdmin) {
      return [...base, "Manager", "Administrator", "SuperAdmin"];
    }

    if (selectedValue && !base.includes(selectedValue)) {
      return [...base, selectedValue];
    }

    return base;
  }

  function getRoleOptions(selectedValue = "Technician") {
    const base = ["Technician"];

    if (isSuperAdmin) {
      return [...base, "Manager", "Administrator"];
    }

    if (selectedValue && !base.includes(selectedValue)) {
      return [...base, selectedValue];
    }

    return base;
  }

  async function loadCurrentUser() {
    try {
      const data = await fetchApi("/auth/me", { cache: "no-store" });
      setCurrentUser(data);
    } catch {
      setCurrentUser(null);
    }
  }

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchApi("/employees", { cache: "no-store" });
      setEmployees(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      setError(e.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
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

      setForm({
        name: "",
        role: "Technician",
        email: "",
        phone: "",
        status: "Active",
        permissionLevel: "Technician",
      });
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

        <div className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="w-fit rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1f3427]">
                Team Workspace
              </div>
              <div className="mt-4 text-2xl font-black tracking-tight text-[#1f3427]">
                Create New Employee
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Add staff members, set roles, and control who can access operational workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-[#f8f4ea] px-4 py-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold text-[#1f3427]">{employees.length}</span> total employees
              </div>
              <div className="mt-1">
                <span className="font-semibold text-[#1f3427]">
                  {employees.filter((employee) => String(employee.status || "Active").toLowerCase() === "active").length}
                </span>{" "}
                active right now
              </div>
              <div className="mt-3 rounded-xl border border-border-soft bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1f3427]">
                Access level: {currentUser?.permissionLevel || currentUser?.role || "Unknown"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Name</span>
              <input
                className={`rounded-xl border bg-white px-3 py-2.5 ${
                  formErrors.name ? "border-red-500" : "border-border-soft"
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
                className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {getRoleOptions(form.role).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Email</span>
              <input
                className={`rounded-xl border bg-white px-3 py-2.5 ${
                  formErrors.email ? "border-red-500" : "border-border-soft"
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
                className={`rounded-xl border bg-white px-3 py-2.5 ${
                  formErrors.phone ? "border-red-500" : "border-border-soft"
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
                className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Permission Level</span>
              <select
                className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                value={form.permissionLevel}
                onChange={(e) =>
                  setForm({ ...form, permissionLevel: e.target.value })
                }
              >
                {getPermissionOptions(form.permissionLevel).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          {!isSuperAdmin ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Team management is limited to technician accounts here. Use the dedicated Super Admin
              workspace for administrator-level staffing and access changes.
            </div>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              className="rounded-xl bg-brand-700 px-4 py-2.5 font-extrabold text-white disabled:opacity-60"
              disabled={busy || !form.name.trim()}
              onClick={createEmployee}
            >
              {busy ? "Saving..." : "Create Employee"}
            </button>

            <button
              className="rounded-xl border border-border-soft bg-white px-4 py-2.5 font-extrabold text-gray-800 disabled:opacity-60"
              disabled={busy}
              onClick={refresh}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <div className="mb-4 text-2xl font-black tracking-tight text-[#1f3427]">
            Team Directory
          </div>
          <p className="mb-5 text-sm leading-6 text-gray-600">
            View employee status, role access, and contact details from one consistent directory.
          </p>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-gray-600">No employees found.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="rounded-2xl border border-border-soft bg-[#fffdf7] p-4 shadow-soft"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0ebde] text-xl font-black text-[#1f3427]">
                      {emp.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-[#1f3427]">
                        {emp.name}
                      </div>
                      <div className="text-sm font-bold text-gray-600">
                        {emp.role}
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
                      Permission: <span className="font-normal">{emp.permissionLevel || emp.role}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-xl border border-border-soft bg-white px-3 py-2.5 font-extrabold text-black disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        setEditing({ ...emp });
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
              className="w-full max-w-2xl rounded-2xl border border-border-soft bg-[#fffdf7] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-xl font-extrabold text-[#1f3427]">
                Edit Employee
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Update role, contact info, status, and access level from one place.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Name</span>
                  <input
                    className={`rounded-xl border bg-white px-3 py-2.5 ${
                      editErrors.name ? "border-red-500" : "border-border-soft"
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
                    className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                    value={editing.role || "Technician"}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value })
                    }
                  >
                    {getRoleOptions(editing.role || "Technician").map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Email</span>
                  <input
                    className={`rounded-xl border bg-white px-3 py-2.5 ${
                      editErrors.email ? "border-red-500" : "border-border-soft"
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
                    className={`rounded-xl border bg-white px-3 py-2.5 ${
                      editErrors.phone ? "border-red-500" : "border-border-soft"
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
                    className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                    value={editing.status || "Active"}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Permission Level</span>
                  <select
                    className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                    value={editing.permissionLevel || editing.role || "Technician"}
                    onChange={(e) =>
                      setEditing({ ...editing, permissionLevel: e.target.value })
                    }
                  >
                    {getPermissionOptions(editing.permissionLevel || editing.role || "Technician").map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-xl border border-border-soft bg-white px-4 py-2.5 font-extrabold"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setEditErrors({});
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-brand-700 px-4 py-2.5 font-extrabold text-white disabled:opacity-60"
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
