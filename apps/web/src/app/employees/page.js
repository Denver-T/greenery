"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";

const EMPLOYEE_NAME_LIMIT = 30;
const EMPLOYEE_EMAIL_LIMIT = 45;
const EMPLOYEE_DEFAULT_FORM = {
  name: "",
  role: "Technician",
  email: "",
  phone: "",
  status: "Active",
  permissionLevel: "Technician",
};

function formatPhoneNumber(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));

  return parts.join("-");
}

function getEmployeeTone(employee) {
  const status = String(employee?.status || "Active").toLowerCase();
  if (status === "inactive") {
    return "theme-panel-muted border-gray-200";
  }

  const role = String(
    employee?.permissionLevel || employee?.role || "",
  ).toLowerCase();
  if (role.includes("admin")) {
    return "theme-panel border-emerald-200";
  }

  if (role.includes("manager")) {
    return "theme-panel border-amber-200";
  }

  return "theme-panel border-border-soft";
}

function validateEmployeeData(data) {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = "Name is required";
  } else if (data.name.trim().length > EMPLOYEE_NAME_LIMIT) {
    errors.name = `Name must be ${EMPLOYEE_NAME_LIMIT} characters or less`;
  }

  if (data.email && data.email.trim()) {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = "Please enter a valid email address";
    } else if (data.email.trim().length > EMPLOYEE_EMAIL_LIMIT) {
      errors.email = `Email must be ${EMPLOYEE_EMAIL_LIMIT} characters or less`;
    }
  }

  if (data.phone && data.phone.trim()) {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    if (!phoneRegex.test(data.phone.trim())) {
      errors.phone = "Phone must be in the format xxx-xxx-xxxx";
    }
  }

  return errors;
}

function EmployeeDetailModal({
  employee,
  editing,
  form,
  errors,
  busy,
  onChange,
  onClose,
  onStartEdit,
  onSave,
  onDelete,
  roleOptions,
  permissionOptions,
}) {
  const renderField = (label, value) => (
    <div className="theme-copy text-sm font-semibold">
      {label}: <span className="font-normal">{value || "-"}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-70 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
        className="w-full max-w-2xl rounded-[30px] border border-border-soft bg-surface p-5 shadow-elevated-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="theme-panel rounded-[28px] border px-5 py-5 shadow-soft">
          <div className="mb-5 flex items-start gap-4">
            <div className="theme-panel-muted theme-title grid h-16 w-16 place-items-center rounded-[22px] text-3xl font-black">
              {(editing ? form.name : employee?.name)?.[0]?.toUpperCase() ||
                "U"}
            </div>
            <div className="flex-1">
              <div
                id="employee-modal-title"
                className="theme-title text-3xl font-black tracking-tight"
              >
                {editing
                  ? form.name || "Employee"
                  : employee?.name || "Employee"}
              </div>
              <div className="theme-copy mt-1 text-xl font-bold">
                {editing ? form.role : employee?.role}
              </div>
              <div className="theme-copy mt-1 text-sm font-semibold">
                ID: {employee?.id}
              </div>
            </div>
          </div>

          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">Name</span>
                <input
                  value={form.name}
                  maxLength={EMPLOYEE_NAME_LIMIT}
                  onChange={(event) =>
                    onChange(
                      "name",
                      event.target.value.slice(0, EMPLOYEE_NAME_LIMIT),
                    )
                  }
                  className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                    errors.name ? "border-red-400" : "border-border-soft"
                  }`}
                />
                {errors.name ? (
                  <span className="text-xs text-red-600">{errors.name}</span>
                ) : null}
              </label>

              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => onChange("role", event.target.value)}
                  className="rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                >
                  {roleOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">Email</span>
                <input
                  value={form.email}
                  maxLength={EMPLOYEE_EMAIL_LIMIT}
                  onChange={(event) =>
                    onChange(
                      "email",
                      event.target.value.slice(0, EMPLOYEE_EMAIL_LIMIT),
                    )
                  }
                  className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                    errors.email ? "border-red-400" : "border-border-soft"
                  }`}
                />
                {errors.email ? (
                  <span className="text-xs text-red-600">{errors.email}</span>
                ) : null}
              </label>

              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">Phone</span>
                <input
                  value={form.phone}
                  inputMode="numeric"
                  maxLength={12}
                  onChange={(event) =>
                    onChange("phone", formatPhoneNumber(event.target.value))
                  }
                  className={`rounded-2xl border bg-white px-4 py-3 text-sm ${
                    errors.phone ? "border-red-400" : "border-border-soft"
                  }`}
                />
                {errors.phone ? (
                  <span className="text-xs text-red-600">{errors.phone}</span>
                ) : null}
              </label>

              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(event) => onChange("status", event.target.value)}
                  className="rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="theme-title text-sm font-semibold">
                  Permission Level
                </span>
                <select
                  value={form.permissionLevel}
                  onChange={(event) =>
                    onChange("permissionLevel", event.target.value)
                  }
                  className="rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                >
                  {permissionOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-3">
              {renderField("Email", employee?.email)}
              {renderField("Phone", employee?.phone)}
              {renderField("Status", employee?.status)}
              {renderField(
                "Permission",
                employee?.permissionLevel || employee?.role,
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={onClose}
                  className="theme-panel-muted theme-title flex-1 rounded-2xl border px-4 py-3 text-lg font-extrabold"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={busy}
                  className="theme-button flex-1 rounded-2xl px-4 py-3 text-lg font-extrabold disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onStartEdit}
                  className="theme-panel-muted theme-title flex-1 rounded-2xl border px-4 py-3 text-lg font-extrabold"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  disabled={busy}
                  className="flex-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-lg font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [formErrors, setFormErrors] = useState({});
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const [form, setForm] = useState(EMPLOYEE_DEFAULT_FORM);

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

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((employee) =>
      [employee.name, employee.role, employee.email, employee.permissionLevel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employees, search]);

  function updateCreateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSelectedField(key, value) {
    setSelectedEmployee((current) =>
      current ? { ...current, [key]: value } : current,
    );
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

      setForm(EMPLOYEE_DEFAULT_FORM);
      setFormErrors({});
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to create employee.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!selectedEmployee) {
      return;
    }

    const errors = validateEmployeeData(selectedEmployee);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setError("");
    setBusy(true);
    try {
      await fetchApi(`/employees/${selectedEmployee.id}`, {
        method: "PUT",
        body: selectedEmployee,
      });
      setSelectedEmployee(null);
      setModalMode("view");
      setFormErrors({});
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to update employee.");
    } finally {
      setBusy(false);
    }
  }

  function requestDeleteEmployee(employee) {
    if (!employee?.id) return;
    setDeleteCandidate(employee);
  }

  async function confirmDeleteEmployee() {
    if (!deleteCandidate?.id) return;

    setError("");
    setBusy(true);
    try {
      await fetchApi(`/employees/${deleteCandidate.id}`, {
        method: "DELETE",
      });
      setDeleteCandidate(null);
      setSelectedEmployee(null);
      setModalMode("view");
      await refresh();
    } catch (e) {
      setError(e.message || "Failed to delete employee.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selectedEmployee && !deleteCandidate) return;
    function handleEsc(e) {
      if (e.key === "Escape") {
        if (deleteCandidate) {
          setDeleteCandidate(null);
        } else {
          setSelectedEmployee(null);
          setModalMode("view");
          setFormErrors({});
        }
      }
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedEmployee, deleteCandidate]);

  return (
    <AppShell title="Manage Employees">
      <div className="space-y-6 p-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="theme-panel rounded-card border p-6 shadow-soft">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="theme-tag w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                Team Workspace
              </div>
              <div className="theme-title mt-4 text-3xl font-black tracking-tight">
                Employee Management
              </div>
              <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
                Manage staff from a cleaner card-based directory, then open a
                profile modal to edit or remove them.
              </p>
            </div>
            <div className="theme-panel-muted rounded-[26px] border px-5 py-4 text-sm shadow-soft">
              <div>
                <span className="theme-title font-semibold">
                  {employees.length}
                </span>{" "}
                total employees
              </div>
              <div className="mt-1">
                <span className="theme-title font-semibold">
                  {
                    employees.filter(
                      (employee) =>
                        String(employee.status || "Active").toLowerCase() ===
                        "active",
                    ).length
                  }
                </span>{" "}
                active right now
              </div>
              <div className="theme-panel mt-3 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
                Access level:{" "}
                {currentUser?.permissionLevel || currentUser?.role || "Unknown"}
              </div>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="theme-panel rounded-[26px] border p-5 shadow-soft">
              <div className="theme-title text-lg font-black">
                Create New Employee
              </div>
              <p className="theme-copy mt-1 text-sm">
                Add staff members, roles, and access levels from one friendly
                panel.
              </p>

              <div className="mt-5 grid gap-x-3 gap-y-4 md:grid-cols-2">
                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Name
                  </span>
                  <input
                    className={`min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm ${
                      formErrors.name ? "border-red-400" : "border-border-soft"
                    }`}
                    value={form.name}
                    maxLength={EMPLOYEE_NAME_LIMIT}
                    onChange={(event) =>
                      updateCreateField(
                        "name",
                        event.target.value.slice(0, EMPLOYEE_NAME_LIMIT),
                      )
                    }
                    placeholder="Matthew Belsham"
                  />
                  {formErrors.name ? (
                    <span className="text-xs text-red-600">
                      {formErrors.name}
                    </span>
                  ) : null}
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Role
                  </span>
                  <select
                    className="min-w-0 rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                    value={form.role}
                    onChange={(event) =>
                      updateCreateField("role", event.target.value)
                    }
                  >
                    {getRoleOptions(form.role).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Email
                  </span>
                  <input
                    className={`min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm ${
                      formErrors.email ? "border-red-400" : "border-border-soft"
                    }`}
                    value={form.email}
                    maxLength={EMPLOYEE_EMAIL_LIMIT}
                    onChange={(event) =>
                      updateCreateField(
                        "email",
                        event.target.value.slice(0, EMPLOYEE_EMAIL_LIMIT),
                      )
                    }
                    placeholder="name@greenery.ca"
                  />
                  {formErrors.email ? (
                    <span className="text-xs text-red-600">
                      {formErrors.email}
                    </span>
                  ) : null}
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Phone
                  </span>
                  <input
                    className={`min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm ${
                      formErrors.phone ? "border-red-400" : "border-border-soft"
                    }`}
                    value={form.phone}
                    inputMode="numeric"
                    maxLength={12}
                    onChange={(event) =>
                      updateCreateField(
                        "phone",
                        formatPhoneNumber(event.target.value),
                      )
                    }
                    placeholder="403-555-1234"
                  />
                  {formErrors.phone ? (
                    <span className="text-xs text-red-600">
                      {formErrors.phone}
                    </span>
                  ) : null}
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Status
                  </span>
                  <select
                    className="min-w-0 rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      updateCreateField("status", event.target.value)
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="theme-title text-sm font-semibold">
                    Permission Level
                  </span>
                  <select
                    className="min-w-0 rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm"
                    value={form.permissionLevel}
                    onChange={(event) =>
                      updateCreateField("permissionLevel", event.target.value)
                    }
                  >
                    {getPermissionOptions(form.permissionLevel).map(
                      (option) => (
                        <option key={option}>{option}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  className="theme-button rounded-2xl px-5 py-3 font-extrabold disabled:opacity-60"
                  disabled={busy || !form.name.trim()}
                  onClick={createEmployee}
                >
                  {busy ? "Saving..." : "Create Employee"}
                </button>

                <button
                  className="theme-panel-muted theme-title rounded-2xl border px-5 py-3 font-extrabold disabled:opacity-60"
                  disabled={busy}
                  onClick={refresh}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="theme-panel rounded-[26px] border p-5 shadow-soft">
              <div className="theme-title text-lg font-black">
                Directory Controls
              </div>
              <p className="theme-copy mt-1 text-sm">
                Search the team and open any employee to manage them in a
                dedicated modal.
              </p>

              <div className="mt-5">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="theme-panel-muted w-full rounded-2xl border px-4 py-3 text-sm"
                  placeholder="Search by name, email, role, or permission"
                />
              </div>

              {!isSuperAdmin ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Team management is limited here for non-Super Admin accounts.
                  You can still view profiles and work within the access already
                  granted.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Super Admin access detected. Full staffing and permission
                  changes are available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="theme-title text-2xl font-black tracking-tight">
                Team Directory
              </div>
              <p className="theme-copy mt-1 text-sm leading-6">
                Click a card to open a profile view with the same kind of clear
                modal layout you showed.
              </p>
            </div>
            <div className="theme-panel-muted theme-title rounded-full border px-4 py-2 text-sm font-semibold">
              Showing {filteredEmployees.length} of {employees.length}
            </div>
          </div>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-gray-600">No employees found.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployee({ ...employee });
                    setModalMode("view");
                    setFormErrors({});
                  }}
                  className={`group rounded-[28px] border p-5 text-left shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(31,52,39,0.15)] ${getEmployeeTone(employee)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="theme-panel-muted theme-title grid h-14 w-14 place-items-center rounded-[20px] text-2xl font-black">
                      {employee.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="theme-title truncate text-xl font-black tracking-tight">
                        {employee.name}
                      </div>
                      <div className="theme-copy mt-1 text-sm font-bold">
                        {employee.role}
                      </div>
                      <div className="theme-copy mt-1 text-xs font-semibold uppercase tracking-[0.14em]">
                        {employee.permissionLevel || employee.role}
                      </div>
                    </div>
                  </div>

                  <div className="theme-copy mt-4 grid gap-2 text-sm">
                    <div className="truncate">
                      <span className="font-semibold">Email:</span>{" "}
                      {employee.email || "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Phone:</span>{" "}
                      {employee.phone || "-"}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Status</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                          String(employee.status || "Active").toLowerCase() ===
                          "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {employee.status || "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="theme-copy mt-4 text-xs font-bold uppercase tracking-[0.16em]">
                    Open profile
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedEmployee ? (
          <EmployeeDetailModal
            employee={selectedEmployee}
            editing={modalMode === "edit"}
            form={selectedEmployee}
            errors={formErrors}
            busy={busy}
            onChange={updateSelectedField}
            onClose={() => {
              setSelectedEmployee(null);
              setModalMode("view");
              setFormErrors({});
            }}
            onStartEdit={() => {
              setModalMode("edit");
              setFormErrors({});
            }}
            onSave={saveEdit}
            onDelete={() => requestDeleteEmployee(selectedEmployee)}
            roleOptions={getRoleOptions(selectedEmployee.role || "Technician")}
            permissionOptions={getPermissionOptions(
              selectedEmployee.permissionLevel ||
                selectedEmployee.role ||
                "Technician",
            )}
          />
        ) : null}

        {deleteCandidate ? (
          <div
            data-testid="employee-delete-modal"
            className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-6"
            onClick={() => setDeleteCandidate(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="employee-delete-title"
              className="w-full max-w-lg rounded-2xl border border-border-soft bg-surface p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700 w-fit">
                Confirm Deletion
              </div>
              <h3
                id="employee-delete-title"
                className="mt-4 text-2xl font-black tracking-tight text-foreground"
              >
                Delete this employee?
              </h3>
              <p className="theme-copy mt-3 text-sm leading-6">
                You are about to remove{" "}
                <span className="font-semibold text-foreground">
                  {deleteCandidate.name || "this employee"}
                </span>
                {deleteCandidate.email ? (
                  <>
                    {" "}
                    (
                    <span className="font-semibold text-foreground">
                      {deleteCandidate.email}
                    </span>
                    )
                  </>
                ) : null}
                . This permanently revokes their access and removes their
                employee record. This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  disabled={busy}
                  className="theme-panel-muted theme-title rounded-2xl border px-4 py-2 text-sm font-bold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEmployee}
                  disabled={busy}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {busy ? "Deleting..." : "Delete Employee"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
