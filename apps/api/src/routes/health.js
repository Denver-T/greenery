const express = require("express");
const router = express.Router();

// Lightweight liveness check.
// This only proves the Node/Express process is up, not that downstream dependencies are healthy.
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
