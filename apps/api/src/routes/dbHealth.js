// apps/api/src/routes/dbHealth.js
const express = require("express");
const { dbHealthCheck } = require("../controllers/dbHealthController");

const router = express.Router();

router.get("/", dbHealthCheck);

module.exports = router;