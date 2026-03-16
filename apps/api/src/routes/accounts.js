const express = require("express");
const accountController = require("../controllers/accountController");
const { writeLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

/**
 * Accounts Routes
 * ---------------
 * Defines HTTP endpoints for account resources.
 *
 * Responsibilities:
 * - Route incoming requests to controller methods
 * - Apply middleware such as rate limiting to write operations
 * - Expose Swagger documentation for API consumers
 *
 * Database alignment:
 * - These routes map to the accounts domain
 * - They are intentionally account-based, not user-based
 */

/**
 * @swagger
 * tags:
 *   - name: Accounts
 *     description: Account management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 12
 *         name:
 *           type: string
 *           example: Jane Doe
 *         role:
 *           type: string
 *           enum: [technician, manager, admin]
 *           example: technician
 *         email:
 *           type: string
 *           nullable: true
 *           example: jane@example.com
 *         phone:
 *           type: string
 *           nullable: true
 *           example: 604-555-1234
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-03-10T18:30:00.000Z
 *
 *     AccountInput:
 *       type: object
 *       required:
 *         - name
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           example: Jane Doe
 *         role:
 *           type: string
 *           enum: [technician, manager, admin]
 *           example: technician
 *         email:
 *           type: string
 *           nullable: true
 *           example: jane@example.com
 *         phone:
 *           type: string
 *           nullable: true
 *           example: 604-555-1234
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Invalid account payload
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
 *                 example: role
 *               issue:
 *                 type: string
 *                 example: "must be one of: technician, manager, admin"
 *
 *     NotFoundError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Account not found
 *         code:
 *           type: string
 *           example: ACCOUNT_NOT_FOUND
 *
 *     ConflictError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: An account with that email already exists
 *         code:
 *           type: string
 *           example: ACCOUNT_CONFLICT
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: email
 *               issue:
 *                 type: string
 *                 example: already in use
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts
 *     description: Returns all accounts in the system.
 *     tags:
 *       - Accounts
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 */
router.get("/", accountController.getAccounts);

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     description: Returns a single account by numeric ID.
 *     tags:
 *       - Accounts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric account ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid account ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get("/:id", accountController.getAccountById);

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     description: Creates a new account record.
 *     tags:
 *       - Accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid account payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Account conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictError'
 *       429:
 *         description: Too many requests
 */
router.post("/", writeLimiter, accountController.createAccount);

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an existing account
 *     description: Updates an existing account by numeric ID.
 *     tags:
 *       - Accounts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric account ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       409:
 *         description: Account conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictError'
 *       429:
 *         description: Too many requests
 */
router.put("/:id", writeLimiter, accountController.updateAccount);

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     description: Deletes an account by numeric ID.
 *     tags:
 *       - Accounts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric account ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       400:
 *         description: Invalid account ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       429:
 *         description: Too many requests
 */
router.delete("/:id", writeLimiter, accountController.deleteAccount);

module.exports = router;