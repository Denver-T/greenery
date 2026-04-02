const db = require("../db");

const REQ_FILTER = "referenceNumber LIKE 'REQ-%'";
const DATE_RANGE = "created_at >= ? AND created_at < ?";
const ACTIVE_STATUSES = "status NOT IN ('completed', 'cancelled')";

async function getPlantAnalytics(startDate, endDate) {
  const rangeMs = new Date(endDate) - new Date(startDate);
  const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
  const periodFormat =
    rangeDays <= 90
      ? "DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d')"
      : "DATE_FORMAT(created_at, '%Y-%m-01')";

  const [
    [overviewRows],
    [topRequestedRows],
    [topReplacedRows],
    [statusRows],
    [timeRows],
    [accountRows],
    [demandRows],
    [lowStockRows],
  ] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) as types,
         COALESCE(SUM(quantity), 0) as units,
         COALESCE(SUM(quantity * cost_per_unit), 0) as value,
         SUM(CASE WHEN quantity <= 2 THEN 1 ELSE 0 END) as lowStock
       FROM plants`,
    ),
    db.query(
      `SELECT LOWER(TRIM(plantWanted)) as plant, COUNT(*) as count,
              COALESCE(SUM(numberOfPlants), 0) as totalPlants
       FROM work_reqs
       WHERE ${REQ_FILTER}
         AND plantWanted IS NOT NULL AND TRIM(plantWanted) != ''
         AND ${DATE_RANGE}
       GROUP BY LOWER(TRIM(plantWanted))
       ORDER BY count DESC LIMIT 10`,
      [startDate, endDate],
    ),
    db.query(
      `SELECT LOWER(TRIM(plantReplaced)) as plant, COUNT(*) as count,
              COALESCE(SUM(numberOfPlants), 0) as totalPlants
       FROM work_reqs
       WHERE ${REQ_FILTER}
         AND plantReplaced IS NOT NULL AND TRIM(plantReplaced) != ''
         AND ${DATE_RANGE}
       GROUP BY LOWER(TRIM(plantReplaced))
       ORDER BY count DESC LIMIT 10`,
      [startDate, endDate],
    ),
    db.query(
      `SELECT status, COUNT(*) as count
       FROM work_reqs
       WHERE ${REQ_FILTER} AND ${DATE_RANGE}
       GROUP BY status`,
      [startDate, endDate],
    ),
    db.query(
      `SELECT ${periodFormat} as period, COUNT(*) as count
       FROM work_reqs
       WHERE ${REQ_FILTER} AND ${DATE_RANGE}
       GROUP BY period ORDER BY period ASC`,
      [startDate, endDate],
    ),
    db.query(
      `SELECT account as label, COUNT(*) as count
       FROM work_reqs
       WHERE ${REQ_FILTER} AND ${DATE_RANGE}
       GROUP BY account ORDER BY count DESC LIMIT 10`,
      [startDate, endDate],
    ),
    db.query(
      `SELECT p.name, p.quantity,
              COALESCE(d.openReqs, 0) as openRequests
       FROM plants p
       LEFT JOIN (
         SELECT LOWER(TRIM(plantWanted)) as plant, COUNT(*) as openReqs
         FROM work_reqs
         WHERE ${REQ_FILTER}
           AND ${ACTIVE_STATUSES}
           AND plantWanted IS NOT NULL AND TRIM(plantWanted) != ''
         GROUP BY LOWER(TRIM(plantWanted))
       ) d ON LOWER(TRIM(p.name)) = d.plant
       ORDER BY openRequests DESC, p.name ASC`,
    ),
    db.query(
      `SELECT name, quantity, cost_per_unit
       FROM plants WHERE quantity <= 2
       ORDER BY quantity ASC, name ASC`,
    ),
  ]);

  const overview = overviewRows[0] || { types: 0, units: 0, value: 0, lowStock: 0 };

  return {
    overview: {
      types: Number(overview.types),
      units: Number(overview.units),
      value: Number(overview.value),
      lowStock: Number(overview.lowStock),
    },
    topRequested: topRequestedRows,
    topReplaced: topReplacedRows,
    requestsByStatus: statusRows,
    requestsOverTime: timeRows,
    topAccountsByVolume: accountRows,
    stockVsDemand: demandRows,
    lowStockPlants: lowStockRows,
  };
}

module.exports = { getPlantAnalytics };
