import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employees.service.js";

export async function getAll(req, res) {
  try {
    const rows = await listEmployees();
    res.json(rows);
  } catch (err) {
    console.error("GET /api/employees error:", err);
    res.status(500).json({ error: "Failed to load employees" });
  }
}

export async function create(req, res) {
  try {
    const created = await createEmployee(req.body);
    res.status(201).json(created);
  } catch (err) {
    const msg = err?.message || "Failed to create employee";
    res.status(msg.includes("required") ? 400 : 500).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const affected = await updateEmployee(id, req.body);
    if (!affected) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err) {
    const msg = err?.message || "Failed to update employee";
    res.status(msg.includes("required") ? 400 : 500).json({ error: msg });
  }
}

export async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const affected = await deleteEmployee(id);
    if (!affected) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/employees error:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
}