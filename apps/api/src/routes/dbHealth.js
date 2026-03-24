// apps/api/src/routes/dbHealth.js
const express = require("express");
const { dbHealthCheck } = require("../controllers/dbHealthController");

const router = express.Router();

// Dedicated readiness-style check for MySQL connectivity.
router.get("/", dbHealthCheck);

module.exports = router;
