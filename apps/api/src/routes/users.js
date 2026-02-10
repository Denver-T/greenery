const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

// GET /users
router.get("/", userController.getUsers);

// GET /users/:id
router.get("/:id", userController.getUserById);

module.exports = router;