const db = require("../db");

async function getPlants() {
  const [rows] = await db.query(
    `SELECT id, name, location, image_url, cost_per_unit, quantity, created_at, updated_at
     FROM plants ORDER BY created_at DESC, id DESC`,
  );
  return rows;
}

async function getPlantsPaginated(limit, offset) {
  const [countResult] = await db.query(`SELECT COUNT(*) as total FROM plants`);
  const totalCount = countResult[0].total;
  const [rows] = await db.query(
    `SELECT id, name, location, image_url, cost_per_unit, quantity, created_at, updated_at
     FROM plants ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return { rows, totalCount };
}

async function getPlantById(id) {
  const [rows] = await db.query(
    `SELECT id, name, location, image_url, cost_per_unit, quantity, created_at, updated_at
     FROM plants WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function createPlant(data) {
  const { name, location, imageUrl, costPerUnit, quantity } = data;
  const [result] = await db.query(
    `INSERT INTO plants (name, location, image_url, cost_per_unit, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [name, location || null, imageUrl || null, costPerUnit || null, quantity || 1],
  );
  return getPlantById(result.insertId);
}

async function updatePlant(id, data) {
  const existing = await getPlantById(id);
  if (!existing) return null;

  const name = data.name ?? existing.name;
  const location = data.location ?? existing.location;
  const imageUrl = data.imageUrl ?? existing.image_url;
  const costPerUnit = data.costPerUnit ?? existing.cost_per_unit;
  // quantity uses explicit undefined check — data.quantity may be undefined (not provided)
  // vs a real value. undefined means "keep existing", a number means "set to this".
  const quantity = data.quantity !== undefined ? data.quantity : existing.quantity;

  await db.query(
    `UPDATE plants SET name = ?, location = ?, image_url = ?, cost_per_unit = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, location, imageUrl, costPerUnit, quantity, id],
  );
  return getPlantById(id);
}

async function deletePlant(id) {
  const [result] = await db.query(`DELETE FROM plants WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getPlants,
  getPlantsPaginated,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
};
