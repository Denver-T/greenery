const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

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
router.post("/", userController.createUser);

module.exports = router;