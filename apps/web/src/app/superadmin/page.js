"use client";

// Super-admin workspace
// ---------------------
// This page is intentionally web-only because it handles governance concerns:
// audit review, admin promotion, and privileged account visibility.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";

const PERMISSION_OPTIONS = ["Administrator", "SuperAdmin"];

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function SuperAdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [promotion, setPromotion] = useState({
    employeeId: "",
    permissionLevel: "Administrator",
  });

  const isSuperAdmin = currentUser?.permissionLevel === "SuperAdmin";

  const activeAdmins = useMemo(
    () =>
      employees.filter((employee) =>
        ["Administrator", "SuperAdmin"].includes(employee.permissionLevel)
      ),
    [employees]
  );

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      // Always resolve the current employee first. The sidebar may already hide this page
      // for non-super-admins, but the page still treats backend identity as the source of truth.
      const me = await fetchApi("/auth/me", { cache: "no-store" });

      setCurrentUser(me);

      if (me?.permissionLevel !== "SuperAdmin") {
        setEmployees([]);
        setLogs([]);
        return;
      }

      const [employeeRows, activityRows] = await Promise.all([
        fetchApi("/superadmin/employees", { cache: "no-store" }),
        fetchApi("/superadmin/logs?limit=60", { cache: "no-store" }),
      ]);

      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setLogs(Array.isArray(activityRows) ? activityRows : []);
    } catch (e) {
      setError(e.message || "Failed to load super admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function promoteEmployee() {
    if (!promotion.employeeId) {
      setError("Select an employee first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      // Promotions go through the dedicated governance route so the backend can:
      // - enforce super-admin-only access
      // - normalize permission values
      // - write a durable audit-log event
      await fetchApi(`/superadmin/employees/${promotion.employeeId}/permission-level`, {
        method: "PATCH",
        body: {
          permissionLevel: promotion.permissionLevel,
        },
      });

      await refresh();
    } catch (e) {
      setError(e.message || "Failed to update permission level.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Super Admin Workspace">
      <div className="p-6">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground">
                Governance Workspace
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
                Super Admin Control
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                Review privileged activity, elevate trusted team members, and keep platform-level
                access changes inside one auditable workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-surface-warm px-5 py-4 text-sm text-gray-600">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Current Authority
              </div>
              <div className="mt-2 text-lg font-extrabold text-foreground">
                {currentUser?.permissionLevel || currentUser?.role || "Unknown"}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {currentUser?.email || "No authenticated email"}
              </div>
            </div>
          </div>
        </div>

        {!loading && !isSuperAdmin ? (
          <div className="mt-6 rounded-card border border-amber-200 bg-amber-50 p-6 shadow-soft">
            <div className="text-lg font-extrabold text-amber-900">Super admin access required</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/80">
              This workspace is reserved for platform governance. Your account can still use the
              regular operations pages, but it cannot view audit logs or assign new admins.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-card border border-border-soft bg-surface p-6 text-gray-600 shadow-soft">
            Loading governance data...
          </div>
        ) : null}

        {!loading && isSuperAdmin ? (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.88fr)]">
              <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      Admin Promotions
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                      Add new admins to the platform
                    </h2>
                  </div>
                  <button
                    className="rounded-xl border border-border-soft bg-white px-4 py-2 text-sm font-bold text-foreground"
                    onClick={refresh}
                    disabled={busy}
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-sm font-bold text-gray-700">Employee</span>
                    <select
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                      value={promotion.employeeId}
                      onChange={(e) =>
                        setPromotion((current) => ({ ...current, employeeId: e.target.value }))
                      }
                    >
                      <option value="">Select employee...</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.permissionLevel})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-bold text-gray-700">Permission Level</span>
                    <select
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5"
                      value={promotion.permissionLevel}
                      onChange={(e) =>
                        setPromotion((current) => ({
                          ...current,
                          permissionLevel: e.target.value,
                        }))
                      }
                    >
                      {PERMISSION_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 rounded-2xl border border-border-soft bg-surface-warm px-4 py-4 text-sm leading-6 text-gray-600">
                  Promotions are written through the backend governance route and automatically
                  logged to the platform activity stream.
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    className="rounded-xl bg-brand-700 px-4 py-2.5 font-extrabold text-white disabled:opacity-60"
                    disabled={busy || !promotion.employeeId}
                    onClick={promoteEmployee}
                  >
                    {busy ? "Updating..." : "Apply Access Change"}
                  </button>
                </div>
              </section>

              <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Current Admin Coverage
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                  Active privileged accounts
                </h2>
                <div className="mt-5 grid gap-3">
                  {activeAdmins.map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-2xl border border-border-soft bg-surface px-4 py-4 shadow-soft"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-extrabold text-foreground">
                            {employee.name}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">{employee.email || "No email"}</div>
                        </div>
                        <div className="rounded-full bg-foreground px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                          {employee.permissionLevel}
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeAdmins.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-soft bg-surface px-4 py-6 text-sm text-gray-600">
                      No administrator-level employees found yet.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    Activity Log
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    Privileged activity history
                  </h2>
                </div>
                <div className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                  {logs.length} recent events
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-border-soft">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-soft bg-surface-warm text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
                      <th scope="col" className="px-4 py-3 text-left">Action</th>
                      <th scope="col" className="px-4 py-3 text-left">Actor</th>
                      <th scope="col" className="px-4 py-3 text-left">Target</th>
                      <th scope="col" className="px-4 py-3 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="text-gray-700">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground">{log.action}</div>
                          {log.metadata ? (
                            <div className="mt-1 text-xs text-gray-500">
                              {JSON.stringify(log.metadata)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{log.actor_email || "System"}</div>
                          <div className="text-xs text-gray-500">
                            {log.actor_permission_level || "Unknown"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{log.target_type}</div>
                          <div className="text-xs text-gray-500">ID: {log.target_id ?? "-"}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{formatTimestamp(log.created_at)}</td>
                      </tr>
                    ))}
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-gray-600">
                          No activity has been logged yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
