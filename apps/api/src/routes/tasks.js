const express = require("express");
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
 *           example: 1
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Weekly watering
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: 2026-03-15T09:00:00.000Z
 *
 *     TaskStatusInput:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [assigned, in_progress, completed, cancelled]
 *           example: completed
 *
 *     TaskAssignInput:
 *       type: object
 *       required:
 *         - assigned_to
 *       properties:
 *         assigned_to:
 *           type: integer
 *           example: 2
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Invalid task payload
 *         code:
 *           type: string
 *           example: VALIDATION_ERROR
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
 *
 *     TaskNotFoundError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Task not found
 *         code:
 *           type: string
 *           example: TASK_NOT_FOUND
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
router.get("/", taskController.getTasks);

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
 *       429:
 *         description: Too many requests
 */
router.patch("/:id/updateStatus", taskController.updateTaskStatus);

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
 *         description: Task or account not found
 *       429:
 *         description: Too many requests
 */
router.patch("/:id/assign", writeLimiter, taskController.assignTask);

module.exports = router;