/**
 * Plant Controller
 * ----------------
 * Responsibilities:
 * - Validate request inputs (params/body)
 * - Call the service layer
 * - Return consistent API responses
 */

const plantService = require("../services/plantService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

exports.getPlants = async (req, res, next) => {
  try {
    const plants = await plantService.getPlants();
    res.status(200).json({ data: plants });
  } catch (err) {
    next(err);
  }
};

exports.getPlantById = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid plant id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const plant = await plantService.getPlantById(id);

    if (!plant) {
      return next(httpError(404, "Plant not found", "PLANT_NOT_FOUND"));
    }

    res.status(200).json({ data: plant });
  } catch (err) {
    next(err);
  }
};

exports.createPlant = async (req, res, next) => {
  try {
    const { name, location } = req.body;

    if (!isNonEmptyString(name)) {
      return next(
        httpError(400, "Field 'name' is required", "VALIDATION_ERROR", [
          { field: "name", issue: "required" },
        ])
      );
    }

    // Keep controller validation minimal: required fields and obvious normalization only.
    const created = await plantService.createPlant({
      name: name.trim(),
      location: isNonEmptyString(location) ? location.trim() : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};
