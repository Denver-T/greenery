"use client";

/**
 * Employee management page.
 *
 * Data flow:
 *   Next.js UI -> calls apps/api (HTTP) -> apps/api talks to MySQL
 */

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export default function EmployeesPage() {
  // ----- Page state -----
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ----- Create form state -----
  const [form, setForm] = useState({
    name: "",
    role: "Technician",
    email: "",
    phone: "",
    status: "Active",
    permissionLevel: "Technician",
  });

  // ----- Form validation state -----
  const [formErrors, setFormErrors] = useState({});

  // ----- Edit modal state -----
  const [editing, setEditing] = useState(null); // employee object or null
  const [editErrors, setEditErrors] = useState({});

  /**
   * Loads employees from the unified backend.
   * This is what makes HeidiSQL inserts show up in the UI.
   */
  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees`, { cache: "no-store" });
      const data = await jsonOrThrow(res);
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

  /**
   * Client-side validation functions
   */
  function validateEmployeeData(data) {
    const errors = {};

    // Name validation
    if (!data.name || !data.name.trim()) {
      errors.name = "Name is required";
    } else if (data.name.trim().length > 30) {
      errors.name = "Name must be 30 characters or less";
    }

    // Email validation (optional but must be valid if provided)
    if (data.email && data.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.email = "Please enter a valid email address";
      } else if (data.email.length > 45) {
        errors.email = "Email must be 45 characters or less";
      }
    }

    // Phone validation (optional but must be valid if provided)
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,3}?[\s\-\.]?[\(]?[\d]{1,4}[\)]?[\s\-\.]?[\d]{1,4}[\s\-\.]?[\d]{1,4}[\s\-\.]?[\d]{0,4}$/;
      if (!phoneRegex.test(data.phone.trim())) {
        errors.phone = "Please enter a valid phone number (e.g., (555) 555-5555), 5555555555";
      } else if (data.phone.length > 12) {
        errors.phone = "Phone must be 12 characters or less";
      }
    }
    return errors;
  }

  /**
   * Create employee (POST)
   */
  async function createEmployee() {
    // Validate form data
    const errors = validateEmployeeData(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Don't submit if there are validation errors
    }

    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await jsonOrThrow(res);

      // Reset form and reload
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

  /**
   * Save edits (PUT)
   */
  async function saveEdit() {
    if (!editing) return;

    // Validate editing data
    const errors = validateEmployeeData(editing);
    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Don't submit if there are validation errors
    }

    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/employees/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      await jsonOrThrow(res);
      setEditing(null);
      setEditErrors({});
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to update employee.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Delete employee (DELETE)
   */
  async function deleteEmployee(id) {
    if (!confirm("Delete this employee?")) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: "DELETE",
      });
      await jsonOrThrow(res);
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
        {/* Error banner */}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {/* Create form */}
        <div className="mb-6 2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-extrabold text-brand-700">
            Create New Employee
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Name</span>
              <input
                className={`rounded-xl border px-3 py-2 ${formErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Magnus Mullen"
              />
              {formErrors.name && <span className="text-xs text-red-600">{formErrors.name}</span>}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Role</span>
              <select
                className={`rounded-xl border px-3 py-2 ${formErrors.role ? 'border-red-500' : 'border-gray-200'}`}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
              </select>
              {formErrors.role && <span className="text-xs text-red-600">{formErrors.role}</span>}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Email</span>
              <input
                className={`rounded-xl border px-3 py-2 ${formErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@greenery.ca"
              />
              {formErrors.email && <span className="text-xs text-red-600">{formErrors.email}</span>}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Phone</span>
              <input
                className={`rounded-xl border px-3 py-2 ${formErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-555-5555"
              />
              {formErrors.phone && <span className="text-xs text-red-600">{formErrors.phone}</span>}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Status</span>
              <select
                className={`rounded-xl border px-3 py-2 ${formErrors.status ? 'border-red-500' : 'border-gray-200'}`}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
              {formErrors.status && <span className="text-xs text-red-600">{formErrors.status}</span>}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Permission Level</span>
              <select
                className={`rounded-xl border px-3 py-2 ${formErrors.permissionLevel ? 'border-red-500' : 'border-gray-200'}`}
                value={form.permissionLevel}
                onChange={(e) => setForm({ ...form, permissionLevel: e.target.value })}
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
              </select>
              {formErrors.permissionLevel && <span className="text-xs text-red-600">{formErrors.permissionLevel}</span>}
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

        {/* List */}
        <div className="2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-extrabold text-brand-700">All Employees</div>

          {loading ? (
            <div className="text-gray-600">Loading…</div>
          ) : employees.length === 0 ? (
            <div className="text-gray-600">No employees found.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-xl">
                      👤
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-gray-900">{emp.name}</div>
                      <div className="text-sm font-bold text-gray-600">{emp.role}</div>
                      <div className="text-xs font-semibold text-gray-500">ID: {emp.id}</div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm font-semibold text-gray-700">
                    <div>Email: <span className="font-normal">{emp.email || "-"}</span></div>
                    <div>Phone: <span className="font-normal">{emp.phone || "-"}</span></div>
                    <div>Status: <span className="font-normal">{emp.status || "Active"}</span></div>
                    <div>Permission: <span className="font-normal">{emp.permissionLevel || emp.role}</span></div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-xl border border-grey-200 bg-white px-3 py-2 font-extrabold text-black disabled:opacity-60"
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

        {/* Edit modal */}
        {editing ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
            onClick={() => setEditing(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-lg font-extrabold text-brand-700">Edit Employee</div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Name</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${editErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.name || ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                  {editErrors.name && <span className="text-xs text-red-600">{editErrors.name}</span>}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Role</span>
                  <select
                    className={`rounded-xl border px-3 py-2 ${editErrors.role ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.role || "Technician"}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  >
                    <option>Technician</option>
                    <option>Manager</option>
                    <option>Administrator</option>
                  </select>
                  {editErrors.role && <span className="text-xs text-red-600">{editErrors.role}</span>}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Email</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${editErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.email || ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  />
                  {editErrors.email && <span className="text-xs text-red-600">{editErrors.email}</span>}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Phone</span>
                  <input
                    className={`rounded-xl border px-3 py-2 ${editErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.phone || ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                  {editErrors.phone && <span className="text-xs text-red-600">{editErrors.phone}</span>}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Status</span>
                  <select
                    className={`rounded-xl border px-3 py-2 ${editErrors.status ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.status || "Active"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  {editErrors.status && <span className="text-xs text-red-600">{editErrors.status}</span>}
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Permission Level</span>
                  <select
                    className={`rounded-xl border px-3 py-2 ${editErrors.permissionLevel ? 'border-red-500' : 'border-gray-200'}`}
                    value={editing.permissionLevel || editing.role || "Technician"}
                    onChange={(e) =>
                      setEditing({ ...editing, permissionLevel: e.target.value })
                    }
                  >
                    <option>Technician</option>
                    <option>Manager</option>
                    <option>Administrator</option>
                  </select>
                  {editErrors.permissionLevel && <span className="text-xs text-red-600">{editErrors.permissionLevel}</span>}
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