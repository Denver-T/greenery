const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");
const taskController = require("../controllers/taskController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Task management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Water Monstera
 *         status:
 *           type: string
 *           enum: [assigned, in_progress, completed, cancelled]
 *           example: assigned
 *         assigned_to:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         plant_id:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Weekly watering
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: 2026-03-15T09:00:00.000Z
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-03-10T18:30:00.000Z
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: 2026-03-10T19:00:00.000Z
 *
 *     TaskInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           example: Water the Ficus
 *         status:
 *           type: string
 *           enum: [assigned, in_progress, completed, cancelled]
 *           example: assigned
 *         assigned_to:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         plant_id:
 *           type: integer
 *           nullable: true
 *           example: 5
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Use 500ml of water
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: 2026-03-10T14:00:00.000Z
 *
 *     TaskStatusInput:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [assigned, in_progress, completed, cancelled]
 *           example: in_progress
 *
 *     TaskAssignInput:
 *       type: object
 *       required:
 *         - assigned_to
 *       properties:
 *         assigned_to:
 *           type: integer
 *           example: 3
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         code:
 *           type: string
 *           example: VALIDATION_ERROR
 *         message:
 *           type: string
 *           example: Invalid task payload
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: status
 *               issue:
 *                 type: string
 *                 example: "must be one of: assigned, in_progress, completed, cancelled"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     TaskNotFoundError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         code:
 *           type: string
 *           example: TASK_NOT_FOUND
 *         message:
 *           type: string
 *           example: Task not found
 *         details:
 *           type: array
 *           example: []
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags:
 *       - Tasks
 *     responses:
 *       200:
 *         description: Successfully retrieved tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 */
router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  taskController.getTasks
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid task ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskNotFoundError'
 */
router.get(
  "/:id",
  verifyToken,
  authorize("technician", "manager", "admin"),
  taskController.getTaskById
);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a new task in the system based on the current schema
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Referenced account not found
 *       429:
 *         description: Too many requests
 */
router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  taskController.createTask
);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskStatusInput'
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskNotFoundError'
 *       429:
 *         description: Too many requests
 */
router.patch(
  "/:id/status",
  writeLimiter,
  verifyToken,
  authorize("technician", "manager", "admin"),
  taskController.updateTaskStatus
);

/**
 * @swagger
 * /tasks/{id}/assign:
 *   patch:
 *     summary: Assign task to an account
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskAssignInput'
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Task or account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskNotFoundError'
 *       429:
 *         description: Too many requests
 */
router.patch(
  "/:id/assign",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  taskController.assignTask
);

module.exports = router;