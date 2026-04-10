const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const analyticsController = require("../controllers/analyticsController");

router.get(
  "/summary",
  verifyToken,
  authorize("technician", "manager", "admin"),
  analyticsController.getSummary,
);

module.exports = router;
