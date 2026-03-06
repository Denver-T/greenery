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
 *     description: Returns a list of all users from the accounts table
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
 *                   example: ok
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Jane Doe
 *                       role:
 *                         type: string
 *                         enum: [technician, manager, admin]
 *                         example: technician
 *                       email:
 *                         type: string
 *                         example: jane.doe@greenery.com
 *                       phone:
 *                         type: string
 *                         example: 555-0199
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
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
 *     description: Get a specific user from the accounts table by their ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved user
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
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: Jane Doe
 *                     role:
 *                       type: string
 *                       enum: [technician, manager, admin]
 *                       example: technician
 *                     email:
 *                       type: string
 *                       example: jane.doe@greenery.com
 *                     phone:
 *                       type: string
 *                       example: 555-0199
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
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
 *     description: Creates a new user in the accounts table
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               role:
 *                 type: string
 *                 enum: [technician, manager, admin]
 *                 example: technician
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.doe@greenery.com
 *               phone:
 *                 type: string
 *                 example: 555-0199
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
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     name:
 *                       type: string
 *                       example: Jane Doe
 *                     role:
 *                       type: string
 *                       enum: [technician, manager, admin]
 *                       example: technician
 *                     email:
 *                       type: string
 *                       example: jane.doe@greenery.com
 *                     phone:
 *                       type: string
 *                       example: 555-0199
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-03-04T12:00:00.000Z
 *       400:
 *         description: Invalid input (e.g., missing name, or invalid email/phone regex)
 */
router.post("/", writeLimiter, userController.createUser);

/**
 * Export router for use in the main application.
 * The router will typically be mounted in app.js as:
 *
 * app.use("/users", usersRouter);
 */
module.exports = router;