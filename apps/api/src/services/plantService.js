const db = require("../db");

// Thin data-access layer for the `plants` table.
// Controllers validate input; this module is responsible for persistence and retrieval.
async function getPlants() {
  const [rows] = await db.query(
    `SELECT id, name, location, created_at
     FROM plants
     ORDER BY created_at DESC, id DESC`,
  );

  return rows;
}

async function getPlantById(id) {
  const [rows] = await db.query(
    `SELECT id, name, location, created_at
     FROM plants
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] || null;
}

async function createPlant(data) {
  // Return the inserted row so API responses always reflect DB-generated values like `id`.
  const [result] = await db.query(
    `INSERT INTO plants (name, location)
     VALUES (?, ?)`,
    [data.name, data.location ?? null],
  );

  return getPlantById(result.insertId);
}

module.exports = {
  getPlants,
  getPlantById,
  createPlant,
};
