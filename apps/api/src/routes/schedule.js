const express = require("express");
const router = express.Router();

const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

// Schedule is currently read-only and backed by `schedule_events`.
// We join `employees` here so clients receive display-ready employee names.
router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `
          SELECT
            s.id,
            s.title,
            s.start_time,
            s.end_time,
            s.employee_id,
            s.work_req_id,
            e.name AS employee_name
          FROM schedule_events s
          LEFT JOIN employees e ON s.employee_id = e.id
          ORDER BY s.start_time ASC
        `,
      );

      return res.status(200).json({ data: rows });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
