const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all schedule events - NO AUTH for testing
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.id,
        s.title,
        s.start_time,
        s.end_time,
        s.work_req_id,
        e.name AS employee_name
      FROM schedule_events s
      LEFT JOIN employees e ON s.employee_id = e.id
      ORDER BY s.start_time ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
