// apps/api/src/routes/users.js

/**
 * Users Routes
 * ------------
 * Defines HTTP endpoints related to user resources.
 *
 * Responsibilities:
 * - Route incoming requests to the appropriate controller
 * - Apply middleware such as rate limiting, authentication, or validation
 * - Provide Swagger documentation for API consumers
 */

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { writeLimiter } = require("../middleware/rateLimiters");

/**
 * -------------------------------------------------------------------------
 * GET /users
 * -------------------------------------------------------------------------
 * Retrieves a list of all users in the system.
 *
 * Middleware:
 * - None applied currently (public read endpoint)
 *
 * Controller:
 * - userController.getUsers
 *
 * Expected Behavior:
 * - Returns a collection of user objects
 * - Returns HTTP 200 on success
 */

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
 * -------------------------------------------------------------------------
 * GET /users/:id
 * -------------------------------------------------------------------------
 * Retrieves a single user by ID.
 *
 * Parameters:
 * - id (path): Unique identifier of the user
 *
 * Middleware:
 * - None applied currently
 *
 * Controller:
 * - userController.getUserById
 *
 * Expected Behavior:
 * - Returns a single user object if found
 * - Returns HTTP 404 if the user does not exist
 */

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
 * -------------------------------------------------------------------------
 * POST /users
 * -------------------------------------------------------------------------
 * Creates a new user in the system.
 *
 * Security:
 * - Protected by rate limiting middleware to prevent abuse
 *
 * Middleware:
 * - writeLimiter: Restricts the number of write operations allowed
 *   within a configured time window.
 *
 * Controller:
 * - userController.createUser
 *
 * Expected Behavior:
 * - Valid request creates a user record
 * - Returns HTTP 201 with the created user data
 * - Returns HTTP 400 for invalid input
 * - Returns HTTP 429 if rate limit is exceeded
 */

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
router.post("/", writeLimiter, userController.createUser);

/**
 * Export router for use in the main application.
 * The router will typically be mounted in app.js as:
 *
 * app.use("/users", usersRouter);
 */
module.exports = router;