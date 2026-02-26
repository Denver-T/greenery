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
 *     description: Creates a new task in the system
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - createdByUserId
 *             properties:
 *               status:
 *                 type: integer
 *                 example: 0 
 *               assignedUserId:
 *                 type: integer
 *                 example: 2 //userId
 *               createdByUserId:
 *                 type: integer
 *                 example: 1 //userId
 *               description:
 *                 type: string
 *                 example: description
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
 *                     TaskID:
 *                       type: integer
 *                       example: 101
 *                     status:
 *                       type: integer
 *                       example: 1
 *                     assignedUserId:
 *                       type: integer
 *                       example: 2
 *                     createdByUserId:
 *                       type: integer
 *                       example: 1
 *                     description:
 *                       type: string
 *                       example: Fix production bug
 *                 timestamp:
 *                   type: string
 *                   example: 2026-02-25T12:00:00.000Z
 *       400:
 *         description: Invalid input
 */
router.post("/", taskController.createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   patch:
 *     summary: Update task status
 *     description: Partially updates the status of a task by its ID
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
 *                 type: integer
 *                 example: 2
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
 *                     TaskID:
 *                       type: integer
 *                       example: 101
 *                     Status:
 *                       type: integer
 *                       example: 2
 *                     AssignedUserId:
 *                       type: integer
 *                       nullable: true
 *                       example: 3
 *                     CreatedByUserId:
 *                       type: integer
 *                       example: 1
 *                     Description:
 *                       type: string
 *                       example: Fix production bug
 *                     CreateTime:
 *                       type: string
 *                       format: date-time
 *                     ChangeTime:
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
 *           example: 101
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