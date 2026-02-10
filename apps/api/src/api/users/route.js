const getPackages = require("../../../lib/services/user.service");

const express = require("express");
const router = express.Router();

router.get("/",async (req, res) => {
  const packages = await getPackages();
  res.status(200).json({
    status: "ok",
    service: packages,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
