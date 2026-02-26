"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Employees Admin Page (CRUD)
 * UI calls API routes:
 *   GET    /api/employees
 *   POST   /api/employees
 *   PUT    /api/employees/:id
 *   DELETE /api/employees/:id
 *
 * ✅ IMPORTANT:
 * The "stickiness" (persistence) happens in the API routes where you connect to MySQL.
 * This page should never connect to the DB directly.
 */

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Create form
  const [newEmp, setNewEmp] = useState({
    name: "",
    role: "Technician",
    email: "",
    phone: "",
    status: "Active",
    permissionLevel: "Technician",
  });

  // Edit modal/state
  const [editing, setEditing] = useState(null); // employee object or null

  const hasData = employees.length > 0;

  async function loadEmployees() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load employees (${res.status})`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function createEmployee() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewEmp({
        name: "",
        role: "Technician",
        email: "",
        phone: "",
        status: "Active",
        permissionLevel: "Technician",
      });
      await loadEmployees(); // refresh list
    } catch (e) {
      setError(e?.message || "Could not create employee.");
    } finally {
      setBusy(false);
    }
  }

  async function updateEmployee(emp) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emp),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      setEditing(null);
      await loadEmployees();
    } catch (e) {
      setError(e?.message || "Could not update employee.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee(id) {
    if (!confirm("Delete this employee?")) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await loadEmployees();
    } catch (e) {
      setError(e?.message || "Could not delete employee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Left nav (simple placeholder to match your prototype vibe) */}
      <aside style={styles.sidebar}>
        <div style={styles.profileCard}>
          <div style={styles.avatar}>👤</div>
          <div>
            <div style={styles.profileName}>Admin Phil Philinson</div>
            <div style={styles.profileSub}>Administrator</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <a style={styles.navItem} href="/admin/dashboard-analytics">
            Dashboard Analytics
          </a>
          <a style={styles.navItem} href="/req-review">
            REQ Review
          </a>
          <a style={styles.navItem} href="/task-sets">
            Create Task Sets
          </a>
          <a style={{ ...styles.navItem, ...styles.navItemActive }} href="/employees">
            Manage Employees
          </a>
          <a style={styles.navItem} href="/calendar">
            View Calendar
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Manage Employees</h1>
          <div style={styles.subTitle}>Admin can view and manage employees (CRUD)</div>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}

        {/* Create new employee */}
        <section style={styles.panel}>
          <div style={styles.panelTitle}>Create New Employee</div>

          <div style={styles.formGrid}>
            <Field label="Name">
              <input
                style={styles.input}
                value={newEmp.name}
                onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                placeholder="e.g., Tung Sahur"
              />
            </Field>

            <Field label="Role">
              <select
                style={styles.input}
                value={newEmp.role}
                onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
              </select>
            </Field>

            <Field label="Email">
              <input
                style={styles.input}
                value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                placeholder="example@greenery.ca"
              />
            </Field>

            <Field label="Phone">
              <input
                style={styles.input}
                value={newEmp.phone}
                onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                placeholder="555-555-5555"
              />
            </Field>

            <Field label="Status">
              <select
                style={styles.input}
                value={newEmp.status}
                onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>

            <Field label="Permission Level">
              <select
                style={styles.input}
                value={newEmp.permissionLevel}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, permissionLevel: e.target.value })
                }
              >
                <option>Technician</option>
                <option>Manager</option>
                <option>Administrator</option>
              </select>
            </Field>
          </div>

          <button
            style={styles.primaryBtn}
            onClick={createEmployee}
            disabled={busy || !newEmp.name.trim()}
          >
            {busy ? "Saving..." : "Create Employee"}
          </button>

          <div style={styles.note}>
            {/* DB linkage note */}
            <strong>DB note:</strong> Create/Update/Delete persist via{" "}
            <code>/api/employees</code> routes. Those routes should execute MySQL
            queries so operations “stick” in the database.
          </div>
        </section>

        {/* List employees */}
        <section style={styles.panel}>
          <div style={styles.panelTitle}>All Employees</div>

          {loading ? (
            <div style={styles.muted}>Loading employees…</div>
          ) : !hasData ? (
            <div style={styles.muted}>No employees yet.</div>
          ) : (
            <div style={styles.cards}>
              {employees.map((emp) => (
                <div key={emp.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.empIcon}>👤</div>
                    <div>
                      <div style={styles.empName}>{emp.name}</div>
                      <div style={styles.empRole}>{emp.role}</div>
                      <div style={styles.empId}>Employee ID: {emp.id}</div>
                    </div>
                  </div>

                  <div style={styles.cardFields}>
                    <div style={styles.cardField}>
                      <span style={styles.cardLabel}>Email:</span>{" "}
                      <span>{emp.email || "-"}</span>
                    </div>
                    <div style={styles.cardField}>
                      <span style={styles.cardLabel}>Phone:</span>{" "}
                      <span>{emp.phone || "-"}</span>
                    </div>
                    <div style={styles.cardField}>
                      <span style={styles.cardLabel}>Status:</span>{" "}
                      <span>{emp.status || "Active"}</span>
                    </div>
                    <div style={styles.cardField}>
                      <span style={styles.cardLabel}>Permission:</span>{" "}
                      <span>{emp.permissionLevel || emp.role}</span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button style={styles.smallBtn} onClick={() => setEditing(emp)}>
                      Edit
                    </button>
                    <button
                      style={{ ...styles.smallBtn, ...styles.dangerBtn }}
                      onClick={() => deleteEmployee(emp.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit modal */}
        {editing ? (
          <EditModal
            employee={editing}
            onClose={() => setEditing(null)}
            onSave={updateEmployee}
            busy={busy}
          />
        ) : null}
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </label>
  );
}

function EditModal({ employee, onClose, onSave, busy }) {
  const [emp, setEmp] = useState(employee);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Edit Employee</div>

        <div style={styles.formGrid}>
          <Field label="Name">
            <input
              style={styles.input}
              value={emp.name || ""}
              onChange={(e) => setEmp({ ...emp, name: e.target.value })}
            />
          </Field>

          <Field label="Role">
            <select
              style={styles.input}
              value={emp.role || "Technician"}
              onChange={(e) => setEmp({ ...emp, role: e.target.value })}
            >
              <option>Technician</option>
              <option>Manager</option>
              <option>Administrator</option>
            </select>
          </Field>

          <Field label="Email">
            <input
              style={styles.input}
              value={emp.email || ""}
              onChange={(e) => setEmp({ ...emp, email: e.target.value })}
            />
          </Field>

          <Field label="Phone">
            <input
              style={styles.input}
              value={emp.phone || ""}
              onChange={(e) => setEmp({ ...emp, phone: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <select
              style={styles.input}
              value={emp.status || "Active"}
              onChange={(e) => setEmp({ ...emp, status: e.target.value })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>

          <Field label="Permission Level">
            <select
              style={styles.input}
              value={emp.permissionLevel || emp.role || "Technician"}
              onChange={(e) =>
                setEmp({ ...emp, permissionLevel: e.target.value })
              }
            >
              <option>Technician</option>
              <option>Manager</option>
              <option>Administrator</option>
            </select>
          </Field>
        </div>

        <div style={styles.modalActions}>
          <button style={styles.smallBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            style={styles.primaryBtn}
            onClick={() => onSave(emp)}
            disabled={busy || !emp.name?.trim()}
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div style={styles.note}>
          <strong>DB note:</strong> Save triggers <code>PUT /api/employees/{emp.id}</code>.
          That API route should update the MySQL row.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    background:
      "linear-gradient(180deg, rgba(20,40,15,0.08), rgba(20,40,15,0.02))",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  sidebar: {
    background: "#2f5f1f",
    color: "white",
    padding: "18px",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  profileCard: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.12)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    marginBottom: "16px",
  },
  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.15)",
    fontSize: "20px",
  },
  profileName: { fontWeight: 800, lineHeight: 1.1 },
  profileSub: { opacity: 0.85, fontSize: "12px" },
  nav: { display: "grid", gap: "10px" },
  navItem: {
    color: "white",
    textDecoration: "none",
    padding: "12px 12px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.10)",
    fontWeight: 750,
  },
  navItemActive: {
    background: "rgba(255,255,255,0.22)",
    outline: "1px solid rgba(255,255,255,0.25)",
  },

  main: { padding: "26px 26px 80px" },
  header: { marginBottom: "14px" },
  title: { margin: 0, fontSize: "32px", color: "#214617" },
  subTitle: { marginTop: "6px", color: "rgba(33,70,23,0.70)", fontWeight: 650 },

  panel: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
    border: "1px solid rgba(33,70,23,0.10)",
    marginTop: "16px",
  },
  panelTitle: { fontWeight: 900, color: "#214617", marginBottom: "12px" },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  field: { display: "grid", gap: "7px" },
  fieldLabel: { fontSize: "12px", fontWeight: 800, color: "#214617" },
  input: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(33,70,23,0.18)",
    outline: "none",
    background: "white",
  },
  primaryBtn: {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "white",
    background: "linear-gradient(135deg, #2f5f1f, #7fa24a)",
    boxShadow: "0 12px 30px rgba(47,95,31,0.18)",
  },
  note: {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "rgba(33,70,23,0.06)",
    border: "1px solid rgba(33,70,23,0.10)",
    color: "rgba(33,70,23,0.8)",
    fontSize: "12px",
  },
  error: {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "rgba(178, 34, 34, 0.10)",
    border: "1px solid rgba(178, 34, 34, 0.25)",
    color: "firebrick",
    fontWeight: 700,
  },
  muted: { color: "rgba(33,70,23,0.65)", fontWeight: 650 },

  cards: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  card: {
    borderRadius: "18px",
    padding: "14px",
    background: "white",
    border: "1px solid rgba(33,70,23,0.10)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
  },
  cardTop: { display: "flex", gap: "12px", alignItems: "center" },
  empIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    display: "grid",
    placeItems: "center",
    background: "rgba(47,95,31,0.10)",
    fontSize: "22px",
  },
  empName: { fontWeight: 1000, color: "#214617", fontSize: "18px" },
  empRole: { color: "rgba(33,70,23,0.70)", fontWeight: 800 },
  empId: { color: "rgba(33,70,23,0.55)", fontSize: "12px", fontWeight: 800 },

  cardFields: { marginTop: "10px", display: "grid", gap: "6px" },
  cardField: {
    padding: "10px 10px",
    borderRadius: "12px",
    background: "rgba(47,95,31,0.08)",
    border: "1px solid rgba(33,70,23,0.08)",
    fontWeight: 750,
    color: "rgba(33,70,23,0.85)",
    fontSize: "13px",
  },
  cardLabel: { fontWeight: 1000, marginRight: "6px" },

  cardActions: { marginTop: "10px", display: "flex", gap: "10px" },
  smallBtn: {
    padding: "10px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 900,
    border: "1px solid rgba(33,70,23,0.18)",
    background: "white",
    color: "#214617",
    flex: 1,
  },
  dangerBtn: {
    border: "1px solid rgba(178,34,34,0.25)",
    color: "firebrick",
    background: "rgba(178,34,34,0.06)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "grid",
    placeItems: "center",
    padding: "18px",
    zIndex: 1000,
  },
  modal: {
    width: "min(720px, 96vw)",
    background: "white",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  modalTitle: { fontWeight: 1000, color: "#214617", marginBottom: "10px" },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "12px",
  },
};