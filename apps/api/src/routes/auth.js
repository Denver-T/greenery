const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

/**
 * GET /auth/me
 * -------------
 * Protected route used to verify authentication middleware.
 * Returns the decoded Firebase user attached to req.user.
 */
router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    data: req.user,
  });
});

module.exports = router;