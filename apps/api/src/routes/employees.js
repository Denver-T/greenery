const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /employees
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, role, email, phone, status, permissionLevel FROM employees ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /employees
router.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = (body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const role = body.role || "Technician";
    const email = body.email || null;
    const phone = body.phone || null;
    const status = body.status || "Active";
    const permissionLevel = body.permissionLevel || role;

    const [result] = await db.query(
      `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role, email, phone, status, permissionLevel]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      role,
      email,
      phone,
      status,
      permissionLevel,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /employees/:id
router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const body = req.body || {};
    const name = (body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const role = body.role || "Technician";
    const email = body.email || null;
    const phone = body.phone || null;
    const status = body.status || "Active";
    const permissionLevel = body.permissionLevel || role;

    const [result] = await db.query(
      `UPDATE employees
       SET name=?, role=?, email=?, phone=?, status=?, permissionLevel=?
       WHERE id=?`,
      [name, role, email, phone, status, permissionLevel, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /employees/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [result] = await db.query("DELETE FROM employees WHERE id=?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;