"use client";

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
    permissionLevel: normalizeRoleForForm(employee.permissionLevel || employee.role),
  };
}

function EmployeeField({ label, error, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  );
}

function EmployeeModal({ editing, setEditing, editErrors, setEditErrors, busy, saveEdit }) {
  if (!editing) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setEditing(null)}>
      <div
        className="app-panel shadow-elevated-lg w-full max-w-3xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <div className="app-badge mb-2">Employee</div>
          <h3 className="app-title text-xl">Edit employee</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EmployeeField label="Name" error={editErrors.name}>
            <input
              className="app-field focus:app-field-focus"
              value={editing.name || ""}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            />
          </EmployeeField>

          <EmployeeField label="Role">
            <select
              className="app-field focus:app-field-focus"
              value={editing.role || "Employee"}
              onChange={(event) => setEditing({ ...editing, role: event.target.value })}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </EmployeeField>

          <EmployeeField label="Email" error={editErrors.email}>
            <input
              className="app-field focus:app-field-focus"
              value={editing.email || ""}
              onChange={(event) => setEditing({ ...editing, email: event.target.value })}
            />
          </EmployeeField>

          <EmployeeField label="Phone" error={editErrors.phone}>
            <input
              className="app-field focus:app-field-focus"
              value={editing.phone || ""}
              onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
            />
          </EmployeeField>

          <EmployeeField label="Status">
            <select
              className="app-field focus:app-field-focus"
              value={editing.status || "Active"}
              onChange={(event) => setEditing({ ...editing, status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </EmployeeField>

          <EmployeeField label="Permission Level">
            <select
              className="app-field focus:app-field-focus"
              value={editing.permissionLevel || editing.role || "Employee"}
              onChange={(event) =>
                setEditing({ ...editing, permissionLevel: event.target.value })
              }
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </EmployeeField>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="app-button app-button-secondary"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setEditErrors({});
            }}
          >
            Cancel
          </button>
          <button
            className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || !editing.name?.trim()}
            onClick={saveEdit}
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
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
    } catch (event) {
      setError(event.message || "Failed to load employees.");
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
        errors.phone = "Please enter a valid phone number";
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
    } catch (event) {
      setError(event.message || "Failed to create employee.");
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
    } catch (event) {
      setError(event.message || "Failed to update employee.");
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
    } catch (event) {
      setError(event.message || "Failed to delete employee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Manage Employees">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="app-panel shadow-soft p-6">
          <div className="mb-6">
            <div className="app-badge mb-3">Admin Controls</div>
            <h2 className="app-title text-2xl">Create a new employee</h2>
            <p className="app-copy mt-2 text-sm">
              Add employees, managers, and admins with the role and permission level needed for Firebase-protected access.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EmployeeField label="Name" error={formErrors.name}>
              <input
                className="app-field focus:app-field-focus"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g., Magnus Mullen"
              />
            </EmployeeField>

            <EmployeeField label="Role">
              <select
                className="app-field focus:app-field-focus"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </EmployeeField>

            <EmployeeField label="Email" error={formErrors.email}>
              <input
                className="app-field focus:app-field-focus"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="example@greenery.ca"
              />
            </EmployeeField>

            <EmployeeField label="Phone" error={formErrors.phone}>
              <input
                className="app-field focus:app-field-focus"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="555-555-5555"
              />
            </EmployeeField>

            <EmployeeField label="Status">
              <select
                className="app-field focus:app-field-focus"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </EmployeeField>

            <EmployeeField label="Permission Level">
              <select
                className="app-field focus:app-field-focus"
                value={form.permissionLevel}
                onChange={(event) => setForm({ ...form, permissionLevel: event.target.value })}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </EmployeeField>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || !form.name.trim()}
              onClick={createEmployee}
            >
              {busy ? "Saving..." : "Create Employee"}
            </button>
            <button className="app-button app-button-secondary" disabled={busy} onClick={refresh}>
              Refresh
            </button>
          </div>
        </section>

        <section className="app-panel shadow-soft p-6">
          <div className="mb-4">
            <h2 className="app-title text-xl">Employee directory</h2>
            <p className="app-copy mt-1 text-sm">Current database-backed team members and permission levels.</p>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-muted-foreground">No employees found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {employees.map((employee) => (
                <div key={employee.id} className="app-inset p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-lg font-black text-brand-700">
                      {(employee.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-lg font-extrabold text-foreground">{employee.name}</div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        {normalizeRoleForForm(employee.role)}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        ID {employee.id}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="text-muted-foreground">
                      Email: <span className="text-foreground">{employee.email || "-"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Phone: <span className="text-foreground">{employee.phone || "-"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Status: <span className="text-foreground">{employee.status || "Active"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Permission:{" "}
                      <span className="text-foreground">
                        {normalizeRoleForForm(employee.permissionLevel || employee.role)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="app-button app-button-secondary flex-1"
                      disabled={busy}
                      onClick={() => {
                        setEditing(toEmployeeForm(employee));
                        setEditErrors({});
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="app-button flex-1 border border-red-300/50 bg-red-100/70 text-red-700 hover:bg-red-200/80 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                      disabled={busy}
                      onClick={() => deleteEmployee(employee.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <EmployeeModal
          editing={editing}
          setEditing={setEditing}
          editErrors={editErrors}
          setEditErrors={setEditErrors}
          busy={busy}
          saveEdit={saveEdit}
        />
      </div>
    </AppShell>
  );
}
