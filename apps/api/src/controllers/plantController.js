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
const { toPositiveInt } = require("../utils/validators");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

function normalizeOptionalString(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeCostPerUnit(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) {
    return null;
  }

  return parsed.toFixed(2);
}

function normalizePlantPayload(body = {}) {
  const errors = [];
  const name = normalizeOptionalString(body.name, 100);
  const location = normalizeOptionalString(body.location, 150);
  const imageUrl = normalizeOptionalString(body.imageUrl ?? body.image_url, 500);
  const rawQuantity = body.quantity;
  const parsedQuantity =
    rawQuantity === undefined || rawQuantity === null || rawQuantity === ""
      ? undefined
      : Number.parseInt(rawQuantity, 10);
  const costPerUnit = normalizeCostPerUnit(body.costPerUnit ?? body.cost_per_unit);

  if (!name) {
    errors.push({ field: "name", issue: "required" });
  }

  if (
    parsedQuantity !== undefined &&
    (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > 500)
  ) {
    errors.push({ field: "quantity", issue: "must be an integer between 1 and 500" });
  }

  if ((body.costPerUnit ?? body.cost_per_unit) !== undefined && costPerUnit === null) {
    errors.push({ field: "costPerUnit", issue: "must be a valid number between 0 and 100000" });
  }

  if (imageUrl && !/^https?:\/\/.+/i.test(imageUrl)) {
    errors.push({ field: "imageUrl", issue: "must be an http or https URL" });
  }

  if (errors.length > 0) {
    return {
      errors,
    };
  }

  return {
    name,
    location,
    imageUrl,
    quantity: parsedQuantity,
    costPerUnit,
  };
}

function resolveUploadedImagePath(req) {
  if (!req?.file?.filename) {
    return null;
  }

  return `/uploads/plants/${req.file.filename}`;
}

exports.getPlants = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    if (pagination) {
      const { rows, totalCount } = await plantService.getPlantsPaginated(pagination.pageSize, pagination.offset);
      return res.status(200).json(paginatedResponse(rows, totalCount, pagination.page, pagination.pageSize));
    }
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
        ]),
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
    const normalized = normalizePlantPayload(req.body);
    if (normalized.errors) {
      return next(httpError(400, "Invalid plant payload", "VALIDATION_ERROR", normalized.errors));
    }

    const created = await plantService.createPlant({
      ...normalized,
      quantity: normalized.quantity ?? 1,
      imageUrl: resolveUploadedImagePath(req) || normalized.imageUrl,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.updatePlant = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid plant id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ]),
      );
    }

    const normalized = normalizePlantPayload(req.body);
    if (normalized.errors) {
      return next(httpError(400, "Invalid plant payload", "VALIDATION_ERROR", normalized.errors));
    }

    const updated = await plantService.updatePlant(id, {
      ...normalized,
      imageUrl: resolveUploadedImagePath(req) || normalized.imageUrl,
    });
    if (!updated) {
      return next(httpError(404, "Plant not found", "PLANT_NOT_FOUND"));
    }

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deletePlant = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid plant id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ]),
      );
    }

    const deleted = await plantService.deletePlant(id);
    if (!deleted) {
      return next(httpError(404, "Plant not found", "PLANT_NOT_FOUND"));
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
};
