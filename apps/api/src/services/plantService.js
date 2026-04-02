const db = require("../db");

let plantSchemaEnsured = false;

async function ensurePlantSchema() {
  if (plantSchemaEnsured) {
    return;
  }

  const [columns] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'plants'`,
  );

  const names = new Set(columns.map((column) => column.COLUMN_NAME));
  const alterStatements = [];

  if (!names.has("image_url")) {
    alterStatements.push(`ADD COLUMN image_url VARCHAR(500) NULL AFTER location`);
  }

  if (!names.has("cost_per_unit")) {
    alterStatements.push(`ADD COLUMN cost_per_unit DECIMAL(10,2) NULL AFTER image_url`);
  }

  if (alterStatements.length > 0) {
    await db.query(`ALTER TABLE plants ${alterStatements.join(", ")}`);
  }

  plantSchemaEnsured = true;
}

function buildGroupWhereClause() {
  return `
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND ((image_url IS NULL AND ? IS NULL) OR image_url = ?)
      AND ((cost_per_unit IS NULL AND ? IS NULL) OR cost_per_unit = ?)
  `;
}

function buildPlantGroupSelect(whereClause = "") {
  return `
    SELECT
      MIN(id) AS id,
      name,
      MAX(location) AS location,
      MAX(image_url) AS image_url,
      MAX(cost_per_unit) AS cost_per_unit,
      COUNT(*) AS quantity,
      MAX(created_at) AS created_at
    FROM plants
    ${whereClause}
    GROUP BY LOWER(TRIM(name)), COALESCE(image_url, ''), COALESCE(cost_per_unit, -1), name
    ORDER BY created_at DESC, id DESC
  `;
}

async function getPlants() {
  await ensurePlantSchema();

  const [rows] = await db.query(buildPlantGroupSelect());
  return rows;
}

async function getPlantById(id) {
  await ensurePlantSchema();

  const [rows] = await db.query(
    `SELECT id, name, location, image_url, cost_per_unit, created_at
     FROM plants
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  const plant = rows[0];
  if (!plant) {
    return null;
  }

  const [groupRows] = await db.query(
    buildPlantGroupSelect(buildGroupWhereClause(plant)),
    [plant.name, plant.image_url ?? null, plant.image_url ?? null, plant.cost_per_unit ?? null, plant.cost_per_unit ?? null],
  );

  return groupRows[0] || null;
}

async function createPlant(data) {
  await ensurePlantSchema();

  const quantity = Number.isInteger(data.quantity) && data.quantity > 0 ? data.quantity : 1;
  const values = Array.from({ length: quantity }, () => [
    data.name,
    data.location ?? null,
    data.imageUrl ?? null,
    data.costPerUnit ?? null,
  ]);

  const [result] = await db.query(
    `INSERT INTO plants (name, location, image_url, cost_per_unit)
     VALUES ?`,
    [values],
  );

  return getPlantById(result.insertId);
}

async function updatePlant(id, data) {
  await ensurePlantSchema();

  const [rows] = await db.query(
    `SELECT id, name, image_url, cost_per_unit
     FROM plants
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  const existing = rows[0];
  if (!existing) {
    return null;
  }

  const [groupRows] = await db.query(
    buildPlantGroupSelect(buildGroupWhereClause(existing)),
    [
      existing.name,
      existing.image_url ?? null,
      existing.image_url ?? null,
      existing.cost_per_unit ?? null,
      existing.cost_per_unit ?? null,
    ],
  );

  const currentQuantity = Number(groupRows[0]?.quantity || 0);
  const targetQuantity =
    Number.isInteger(data.quantity) && data.quantity > 0 ? data.quantity : currentQuantity || 1;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE plants
       SET name = ?,
           location = ?,
           image_url = ?,
           cost_per_unit = ?
       ${buildGroupWhereClause(existing)}`,
      [
        data.name,
        data.location ?? null,
        data.imageUrl ?? null,
        data.costPerUnit ?? null,
        existing.name,
        existing.image_url ?? null,
        existing.image_url ?? null,
        existing.cost_per_unit ?? null,
        existing.cost_per_unit ?? null,
      ],
    );

    if (targetQuantity > currentQuantity) {
      const extraValues = Array.from({ length: targetQuantity - currentQuantity }, () => [
        data.name,
        data.location ?? null,
        data.imageUrl ?? null,
        data.costPerUnit ?? null,
      ]);

      await connection.query(
        `INSERT INTO plants (name, location, image_url, cost_per_unit)
         VALUES ?`,
        [extraValues],
      );
    } else if (targetQuantity < currentQuantity) {
      await connection.query(
        `DELETE FROM plants
         WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
           AND ((image_url IS NULL AND ? IS NULL) OR image_url = ?)
           AND ((cost_per_unit IS NULL AND ? IS NULL) OR cost_per_unit = ?)
         ORDER BY id DESC
         LIMIT ?`,
        [
          data.name,
          data.imageUrl ?? null,
          data.imageUrl ?? null,
          data.costPerUnit ?? null,
          data.costPerUnit ?? null,
          currentQuantity - targetQuantity,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [updatedRows] = await db.query(
    buildPlantGroupSelect(
      buildGroupWhereClause({
        name: data.name,
        image_url: data.imageUrl ?? null,
        cost_per_unit: data.costPerUnit ?? null,
      }),
    ),
    [
      data.name,
      data.imageUrl ?? null,
      data.imageUrl ?? null,
      data.costPerUnit ?? null,
      data.costPerUnit ?? null,
    ],
  );

  return updatedRows[0] || null;
}

async function deletePlant(id) {
  await ensurePlantSchema();

  const [rows] = await db.query(
    `SELECT id, name, image_url, cost_per_unit
     FROM plants
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  const existing = rows[0];
  if (!existing) {
    return false;
  }

  const [result] = await db.query(
    `DELETE FROM plants
     ${buildGroupWhereClause(existing)}`,
    [
      existing.name,
      existing.image_url ?? null,
      existing.image_url ?? null,
      existing.cost_per_unit ?? null,
      existing.cost_per_unit ?? null,
    ],
  );

  return result.affectedRows > 0;
}

module.exports = {
  getPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  ensurePlantSchema,
};
