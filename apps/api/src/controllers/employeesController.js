// apps/api/src/controllers/employeesController.js

const employeesService = require("../services/employeesService");

async function getAll(req, res, next) {
  try {
    const rows = await employeesService.listEmployees();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const created = await employeesService.createEmployee(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err.message === "Name is required") {
      return res.status(400).json({ error: err.message });
    }

    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updated = await employeesService.updateEmployee(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.message === "Name is required") {
      return res.status(400).json({ error: err.message });
    }

    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const deleted = await employeesService.deleteEmployee(id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};