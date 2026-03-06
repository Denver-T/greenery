// apps/api/src/routes/tasks.js

const express = require("express");
const router = express.Router();

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
 *     description: Creates a new task in the system
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 *
 * NOTE:
 * Your existing Swagger schema here previously described fields like
 * createdByUserId / assignedUserId / description, which does NOT match the
 * controller currently validating `{ title, status, createUser }`.
 *
 * If your DB/service expects different names, update the controller + service
 * together, but keep them consistent.
 */
router.post("/", taskController.createTask);

/**
 * PATCH /tasks/:id/status
 * Prefer explicit sub-resource naming for partial updates.
 *
 * Your controller method name is `updateTaskStatus`, so it’s clearer if
 * the route path includes `/status` rather than PATCHing the base resource.
 *
 * If you MUST keep `PATCH /tasks/:id`, the controller still works, but it’s
 * easier for teammates and clients to understand when it’s explicit.
 */
/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     description: Updates ONLY the status of a task by its ID
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
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Task not found
 */
router.patch("/:id/status", taskController.updateTaskStatus);

/**
 * @swagger
 * /tasks/{id}/assign:
 *   patch:
 *     summary: Assign task to a user
 *     description: Updates the assigned user of a task
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
 *               - assignedUserId
 *             properties:
 *               assignedUserId:
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

module.exports = router;