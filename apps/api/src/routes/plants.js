const express = require("express");
const plantController = require("../controllers/plantController");

const router = express.Router();

// GET /plants
router.get("/", plantController.getPlants);

// GET /plants/:id
router.get("/:id", plantController.getPlantById);

module.exports = router;