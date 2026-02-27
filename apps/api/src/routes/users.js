const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Successfully retrieved users
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
router.get("/", userController.getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get User By Id
 *     description: Get the specific user by Id
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved users
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
router.get("/:id", userController.getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user in the system
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: medhi
 *               email:
 *                 type: string
 *                 format: email
 *                 example: medhi@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                     userId:
 *                       type: integer
 *                       example: 101
 *                     username:
 *                       type: string
 *                       example: medhi
 *                     email:
 *                       type: string
 *                       example: medhi@example.com
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-02-25T12:00:00.000Z
 *       400:
 *         description: Invalid input
 */
router.post("/", userController.createUser);

module.exports = router;