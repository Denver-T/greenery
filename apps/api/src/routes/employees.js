// apps/api/src/routes/employees.js

const express = require("express");
const router = express.Router();
const employeesController = require("../controllers/employeesController");

router.get("/", employeesController.getAll);
router.post("/", employeesController.create);
router.put("/:id", employeesController.update);
router.delete("/:id", employeesController.remove);

module.exports = router;