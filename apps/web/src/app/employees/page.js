"use client";

/**
 * Employees page (WEB)
 * ----------------------------------------------------------
 * This is UI only. It does NOT touch the database directly.
 *
 * Data flow:
 *   Next.js UI -> calls apps/api (HTTP) -> apps/api talks to MySQL
 *
 * API endpoints used:
 *   GET    http://localhost:3001/employees
 *   POST   http://localhost:3001/employees
 *   PUT    http://localhost:3001/employees/:id
 *   DELETE http://localhost:3001/employees/:id
 *
 * Config:
 *   Set NEXT_PUBLIC_API_URL in apps/web/.env.local
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
  {/* ----- Page state ----- */}
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  {/* ----- Create form state ----- */}
  const [form, setForm] = useState({
    name: "",
    role: "Technician",
    email: "",
    phone: "",
    status: "Active",
    permissionLevel: "Technician",
  });

  {/* ----- Edit modal state -----*/}
  const [editing, setEditing] = useState(null); // employee object or null

  {/**
   * Load employees from the unified backend.
   * This is what makes HeidiSQL inserts show up in the UI.
   */}
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

  {/**
   * Create employee (POST)
   */}
  async function createEmployee() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await jsonOrThrow(res);

      {/* Reset form and reload */}
      setForm({
        name: "",
        role: "Technician",
        email: "",
        phone: "",
        status: "Active",
        permissionLevel: "Technician",
      });
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to create employee.");
    } finally {
      setBusy(false);
    }
  }

  {/**
   * Save edits (PUT)
   */}
  async function saveEdit() {
    if (!editing) return;
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
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to update employee.");
    } finally {
      setBusy(false);
    }
  }

  {/**
   * Delete employee (DELETE)
   */}
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
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-extrabold text-brand-700">
            Create New Employee
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Name</span>
              <input
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Tung Sahur"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Role</span>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Email</span>
              <input
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@greenery.ca"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Phone</span>
              <input
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-555-5555"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-bold text-gray-700">Status</span>
              <select
                className="rounded-xl border border-gray-200 px-3 py-2"
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
                className="rounded-xl border border-gray-200 px-3 py-2"
                value={form.permissionLevel}
                onChange={(e) => setForm({ ...form, permissionLevel: e.target.value })}
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
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

          <p className="mt-3 text-xs font-semibold text-gray-500">
            Data comes from <code>{API_BASE}/employees</code> (apps/api). HeidiSQL inserts will appear after Refresh.
          </p>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 font-extrabold disabled:opacity-60"
                      disabled={busy}
                      onClick={() => setEditing({ ...emp })}
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
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.name || ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Role</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.role || "Technician"}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  >
                    <option>Technician</option>
                    <option>Manager</option>
                    <option>Administrator</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Email</span>
                  <input
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.email || ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Phone</span>
                  <input
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.phone || ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Status</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.status || "Active"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-bold text-gray-700">Permission Level</span>
                  <select
                    className="rounded-xl border border-gray-200 px-3 py-2"
                    value={editing.permissionLevel || editing.role || "Technician"}
                    onChange={(e) =>
                      setEditing({ ...editing, permissionLevel: e.target.value })
                    }
                  >
                    <option>Technician</option>
                    <option>Manager</option>
                    <option>Administrator</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-extrabold"
                  disabled={busy}
                  onClick={() => setEditing(null)}
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

              <p className="mt-3 text-xs font-semibold text-gray-500">
                Saves to <code>{API_BASE}/employees/{editing.id}</code>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}