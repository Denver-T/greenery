const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskController");

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timestamp:
 *                   type: string
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
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *       404:
 *         description: User not found
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
 *       400:
 *         description: Invalid input
 */
router.post("/", taskController.createTask);

/**
 * @swagger
 * /tasks/{id}:
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
 *           example: 101
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
router.patch("/:id", taskController.updateTaskStatus);

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
 *           example: 101
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

module.exports = router;