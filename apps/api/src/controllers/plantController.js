const plantService = require("../services/plantService");

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
    const plant = await plantService.getPlantById(req.params.id);

    if (!plant) {
      return res.status(404).json({
        error: { message: "Plant not found", code: "PLANT_NOT_FOUND" },
      });
    }

    res.status(200).json({ data: plant });
  } catch (err) {
    next(err);
  }
};