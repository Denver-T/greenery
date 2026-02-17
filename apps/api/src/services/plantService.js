// In-memory stub data for scaffolding (SV-27)
const plants = [
  { id: 1, name: "Monstera Deliciosa", location: "Lobby" },
  { id: 2, name: "Fiddle Leaf Fig", location: "Conference Room" },
];

exports.getPlants = async () => {
  return plants;
};

exports.getPlantById = async (id) => {
  const num = Number(id);
  return plants.find((p) => p.id === num) || null;
};