// In-memory stub data for scaffolding (SV-27)
const users = [
  { id: 1, name: "Tech One", role: "technician" },
  { id: 2, name: "Manager One", role: "manager" },
];

exports.getUsers = async () => {
  return users;
};

exports.getUserById = async (id) => {
  const num = Number(id);
  return users.find((u) => u.id === num) || null;
};