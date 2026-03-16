// apps/api/src/routes/tasks.js

const express = require("express");
const router = express.Router();
const db = require("../db");
const taskController = require("../controllers/taskController");

/**
 * Task Routes
 * -----------
 * Thin HTTP routing layer:
 * - Maps URLs + HTTP verbs to controller methods
 * - Keeps business logic out of routes
 * - Swagger docs live here (or can be extracted later)
 *
 * Important consistency notes:
 * - Controller methods should ONLY send success responses.
 * - All error responses must be produced by the global error handler.
 * - Route paths should match controller intent (e.g., status update vs assignment).
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Returns a list of all tasks
 *     tags:
 *       - Tasks
 *     responses:
 *       200:
 *         description: Successfully retrieved tasks
 */
router.get("/", taskController.getTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get Task By Id
 *     description: Get the specific task by Id
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the task
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved task
 *       404:
 *         description: Task not found
 */
router.get("/:id", taskController.getTaskById);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a new task in the system based on the updated schema
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Water the Ficus
 *               status:
 *                 type: string
 *                 enum: [assigned, in_progress, completed, cancelled]
 *                 example: assigned
 *               assigned_to:
 *                 type: integer
 *                 example: 2
 *               plant_id:
 *                 type: integer
 *                 example: 5
 *               notes:
 *                 type: string
 *                 example: Use 500ml of water
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-03-10T14:00:00.000Z
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     title:
 *                       type: string
 *                       example: Water the Ficus
 *                     status:
 *                       type: string
 *                       example: assigned
 *                     assigned_to:
 *                       type: integer
 *                       example: 2
 *                     plant_id:
 *                       type: integer
 *                       example: 5
 *                     notes:
 *                       type: string
 *                       example: Use 500ml of water
 *                     due_date:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-03-10T14:00:00.000Z
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-03-03T12:00:00.000Z
 *             properties:
 *               title:
 *                 type: string
 *                 example: Fix production bug
 *               status:
 *                 type: string
 *                 example: assigned
 *               createUser:
 *                 type: integer
 *                 example: 1
 */
router.post("/", taskController.createTask);

/**
 * @swagger
 * /tasks/{id}/updateStatus:
 *   patch:
 *     summary: Update task status
 *     description: Updates the ENUM status of a task by its ID
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [assigned, in_progress, completed, cancelled]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     title:
 *                       type: string
 *                       example: Water the Ficus
 *                     status:
 *                       type: string
 *                       example: in_progress
 *                     assigned_to:
 *                       type: integer
 *                       example: 3
 *                     plant_id:
 *                       type: integer
 *                       example: 5
 *                     notes:
 *                       type: string
 *                       example: Fix production bug
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Task not found
 */
router.patch("/:id/updateStatus", taskController.updateTaskStatus);

<<<<<<< HEAD
/**
 * @swagger
 * /tasks/{id}/assign:
 *   patch:
 *     summary: Assign task to a user
 *     description: Updates the assigned_to field of a task
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigned_to
 *             properties:
 *               assigned_to:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Task not found
 */
router.patch("/:id/assign", taskController.assignTask);
=======
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
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386

module.exports = router;