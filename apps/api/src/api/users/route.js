const { GetPackages } = require("../../../lib/services/user.service");

const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users in the system
 *     responses:
 *       200:
 *       description: Success
 */
router.get("/", async (req, res) => {
  const packages = await GetPackages();
  res.status(200).json({
    status: "ok",
    service: packages,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
