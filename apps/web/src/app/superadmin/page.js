"use client";

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
              <div className="w-fit rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1f3427]">
                Governance Workspace
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-[#1f3427]">
                Super Admin Control
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                Review privileged activity, elevate trusted team members, and keep platform-level
                access changes inside one auditable workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-[#f8f4ea] px-5 py-4 text-sm text-gray-600">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Current Authority
              </div>
              <div className="mt-2 text-lg font-extrabold text-[#1f3427]">
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
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1f3427]">
                      Add new admins to the platform
                    </h2>
                  </div>
                  <button
                    className="rounded-xl border border-border-soft bg-white px-4 py-2 text-sm font-bold text-[#1f3427]"
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

                <div className="mt-5 rounded-2xl border border-border-soft bg-[#f8f4ea] px-4 py-4 text-sm leading-6 text-gray-600">
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
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1f3427]">
                  Active privileged accounts
                </h2>
                <div className="mt-5 grid gap-3">
                  {activeAdmins.map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-2xl border border-border-soft bg-[#fffdf7] px-4 py-4 shadow-soft"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-extrabold text-[#1f3427]">
                            {employee.name}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">{employee.email || "No email"}</div>
                        </div>
                        <div className="rounded-full bg-[#1f3427] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                          {employee.permissionLevel}
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeAdmins.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-soft bg-[#fffdf7] px-4 py-6 text-sm text-gray-600">
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
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1f3427]">
                    Privileged activity history
                  </h2>
                </div>
                <div className="rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#1f3427]">
                  {logs.length} recent events
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-border-soft">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] gap-4 border-b border-border-soft bg-[#f8f4ea] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-600">
                  <div>Action</div>
                  <div>Actor</div>
                  <div>Target</div>
                  <div>When</div>
                </div>
                <div className="divide-y divide-border-soft bg-white">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] gap-4 px-4 py-4 text-sm text-gray-700"
                    >
                      <div>
                        <div className="font-bold text-[#1f3427]">{log.action}</div>
                        {log.metadata ? (
                          <div className="mt-1 text-xs text-gray-500">
                            {JSON.stringify(log.metadata)}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <div className="font-semibold">{log.actor_email || "System"}</div>
                        <div className="text-xs text-gray-500">
                          {log.actor_permission_level || "Unknown"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">{log.target_type}</div>
                        <div className="text-xs text-gray-500">ID: {log.target_id ?? "-"}</div>
                      </div>
                      <div className="text-sm text-gray-600">{formatTimestamp(log.created_at)}</div>
                    </div>
                  ))}

                  {logs.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-600">
                      No activity has been logged yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
