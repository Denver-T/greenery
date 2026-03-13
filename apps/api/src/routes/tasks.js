const express = require("express");
const router = express.Router();
const db = require("../db");
const taskController = require("../controllers/taskController");

router.get("/", taskController.getTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);
router.patch("/:id", taskController.updateTaskStatus);

router.post("/assign", async (req, res, next) => {
  try {
    const { employeeId, dueDate, taskIds } = req.body || {};

    if (!employeeId || !dueDate || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        error: "employeeId, dueDate, and taskIds are required",
      });
    }

    const placeholders = taskIds.map(() => "?").join(",");

    const [result] = await db.query(
      `
      UPDATE work_reqs
      SET assignedTo = ?, dueDate = ?, status = 'assigned'
      WHERE id IN (${placeholders})
      `,
      [employeeId, dueDate, ...taskIds]
    );

    res.json({
      ok: true,
      updated: result.affectedRows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;